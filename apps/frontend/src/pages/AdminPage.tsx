import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Ban,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Copy,
  Eye,
  HeartHandshake,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  MailCheck,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trophy,
  UserRoundCog,
  Users
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminEmptyState, AdminMetricCard, AdminNavigation, AdminSectionHeader, type AdminSection } from "../components/admin/AdminWorkspace";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { adminApi } from "../services/adminApi";
import { supportApi } from "../services/supportApi";
import type { AdminActivityDayDto, AdminAnalyticsDto, AdminAuditLogDto, AdminUserDto, FinancialTransactionDto, RestrictionType, ScoreReviewDto, SupportTicketDto, SupportTicketSource, SupportTicketStatus } from "../types/api";

type AdminAction = "ban" | "unban" | "thank" | "resetScores";
type SupportAction = { ticket: SupportTicketDto; status: SupportTicketStatus };

const banReasonKeys = [
  "scoreManipulation",
  "botAccount",
  "abusiveSupport",
  "harassment",
  "spam",
  "multiAccount",
  "paymentFraud",
  "devtools",
  "termsViolation"
];

type ActivityMetricKey = "gameSessions" | "validScores" | "adViews" | "guestSessions" | "newUsers";

function AdminActivityChart({ rows }: { rows: AdminActivityDayDto[] }) {
  const { t } = useTranslation();
  const metrics: Array<{ key: ActivityMetricKey; label: string; className: string }> = [
    { key: "gameSessions", label: t("adminExtra.activityGraph.sessions"), className: "bg-cyanGlow" },
    { key: "validScores", label: t("adminExtra.activityGraph.scores"), className: "bg-emerald-400" },
    { key: "adViews", label: t("adminExtra.activityGraph.ads"), className: "bg-goldGlow" },
    { key: "guestSessions", label: t("adminExtra.activityGraph.guests"), className: "bg-violet-400" },
    { key: "newUsers", label: t("adminExtra.activityGraph.users"), className: "bg-sky-300" }
  ];
  const maxTotal = Math.max(1, ...rows.map((row) => metrics.reduce((total, metric) => total + row[metric.key], 0)));
  const maxErrors = Math.max(1, ...rows.map((row) => row.clientErrors));

  return (
    <div className="mt-6 rounded-lg border border-white/10 bg-ink/55 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-white">{t("adminExtra.activityGraph.title")}</h3>
          <p className="mt-1 text-sm text-slate-400">{t("adminExtra.activityGraph.description")}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-300">
          {metrics.map((metric) => (
            <span key={metric.key} className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1">
              <span className={`h-2.5 w-2.5 rounded-full ${metric.className}`} />
              {metric.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-magentaGlow" />
            {t("adminExtra.activityGraph.errors")}
          </span>
        </div>
      </div>

      <div className="mt-5 grid min-h-64 grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
        <div className="flex flex-col justify-between text-right text-xs text-slate-500">
          <span>{maxTotal}</span>
          <span>{Math.ceil(maxTotal / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative rounded-md border border-white/10 bg-white/[0.03] px-2 pb-8 pt-3">
          <div className="pointer-events-none absolute inset-x-2 top-1/2 border-t border-white/10" />
          <div className="pointer-events-none absolute inset-x-2 top-3 border-t border-white/10" />
          <div className="flex h-52 items-end gap-2">
            {rows.map((row) => {
              const total = metrics.reduce((sum, metric) => sum + row[metric.key], 0);
              const barHeight = total === 0 ? 4 : Math.max(8, Math.round((total / maxTotal) * 100));
              const errorHeight = row.clientErrors === 0 ? 0 : Math.max(8, Math.round((row.clientErrors / maxErrors) * 100));
              return (
                <div key={row.date} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                  {row.clientErrors ? (
                    <span
                      className="absolute z-10 h-2.5 w-2.5 rounded-full bg-magentaGlow shadow-danger"
                      style={{ bottom: `${errorHeight}%` }}
                      aria-label={t("adminExtra.activityGraph.errorCount", { count: row.clientErrors })}
                    />
                  ) : null}
                  <div
                    className="flex w-full max-w-9 flex-col-reverse overflow-hidden rounded-t-md border border-white/10 bg-white/5 transition group-hover:scale-[1.03]"
                    style={{ height: `${barHeight}%` }}
                    title={`${row.label}: ${total}`}
                  >
                    {metrics.map((metric) => {
                      const value = row[metric.key];
                      if (!value) return null;
                      return (
                        <span
                          key={metric.key}
                          className={metric.className}
                          style={{ height: `${Math.max(8, (value / Math.max(total, 1)) * 100)}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="absolute -bottom-7 hidden rotate-[-35deg] whitespace-nowrap text-[10px] font-bold text-slate-500 sm:block">{row.label}</div>
                  <div className="pointer-events-none absolute bottom-full mb-2 hidden w-48 rounded-md border border-white/10 bg-panel p-3 text-xs text-slate-300 shadow-2xl group-hover:block">
                    <div className="mb-2 font-black text-white">{row.label}</div>
                    <div>{t("adminExtra.activityGraph.sessions")}: {row.gameSessions}</div>
                    <div>{t("adminExtra.activityGraph.scores")}: {row.validScores}</div>
                    <div>{t("adminExtra.activityGraph.ads")}: {row.adViews}</div>
                    <div>{t("adminExtra.activityGraph.guests")}: {row.guestSessions}</div>
                    <div>{t("adminExtra.activityGraph.users")}: {row.newUsers}</div>
                    <div className="text-pink-200">{t("adminExtra.activityGraph.errors")}: {row.clientErrors}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState<{ type: AdminAction; user: AdminUserDto } | null>(null);
  const [actionText, setActionText] = useState("");
  const [supportTickets, setSupportTickets] = useState<SupportTicketDto[]>([]);
  const [supportStatus, setSupportStatus] = useState<SupportTicketStatus | "ALL">("ALL");
  const [supportSource, setSupportSource] = useState<SupportTicketSource | "ALL">("ALL");
  const [supportAction, setSupportAction] = useState<SupportAction | null>(null);
  const [supportResponse, setSupportResponse] = useState("");
  const [supportInternalNote, setSupportInternalNote] = useState("");
  const [supportAppealStatus, setSupportAppealStatus] = useState("");
  const [emailVerificationUser, setEmailVerificationUser] = useState<AdminUserDto | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<{ user: AdminUserDto; value: string } | null>(null);
  const [scores, setScores] = useState<ScoreReviewDto[]>([]);
  const [scoreAction, setScoreAction] = useState<{ score: ScoreReviewDto; status: "valid" | "rejected" | "hidden" } | null>(null);
  const [scoreReason, setScoreReason] = useState("");
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogDto[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransactionDto[]>([]);
  const [guestTransfers, setGuestTransfers] = useState<Array<{ id: string; userId: string; status: string; bestScore: number; transferredScore: number; reason?: string | null; createdAt: string }>>([]);
  const [restrictionUser, setRestrictionUser] = useState<AdminUserDto | null>(null);
  const [restrictionType, setRestrictionType] = useState<RestrictionType>("leaderboard_restriction");
  const [restrictionReason, setRestrictionReason] = useState("");
  const [analytics, setAnalytics] = useState<AdminAnalyticsDto | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [userStatusFilter, setUserStatusFilter] = useState<"ALL" | "ACTIVE" | "BANNED">("ALL");
  const [userTrustFilter, setUserTrustFilter] = useState<"ALL" | "NORMAL" | "TRUSTED" | "SUSPICIOUS">("ALL");
  const [scoreStatusFilter, setScoreStatusFilter] = useState<"review" | "all" | "valid" | "suspicious" | "pending_review" | "rejected" | "hidden">("review");
  const [supportQuery, setSupportQuery] = useState("");
  const [activityQuery, setActivityQuery] = useState("");
  const [sectionBusy, setSectionBusy] = useState<Partial<Record<AdminSection, boolean>>>({});
  const [sectionLoaded, setSectionLoaded] = useState<Partial<Record<AdminSection, boolean>>>({});
  const [sectionUpdatedAt, setSectionUpdatedAt] = useState<Partial<Record<AdminSection, string>>>({});

  const actionTitle = useMemo(() => {
    if (!action) {
      return "";
    }
    return action.type === "resetScores" ? t("adminExtra.resetUserScores") : t(`admin.${action.type}`);
  }, [action, t]);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          (userStatusFilter === "ALL" || user.status === userStatusFilter) &&
          (userTrustFilter === "ALL" || user.trustStatus === userTrustFilter)
      ),
    [userStatusFilter, userTrustFilter, users]
  );

  const visibleScores = useMemo(
    () =>
      scores.filter((score) => {
        if (scoreStatusFilter === "all") return true;
        if (scoreStatusFilter === "review") return score.status !== "valid" || Boolean(score.reviewReason);
        return score.status === scoreStatusFilter;
      }),
    [scoreStatusFilter, scores]
  );

  const visibleSupportTickets = useMemo(() => {
    const normalized = supportQuery.trim().toLocaleLowerCase();
    return supportTickets.filter((ticket) => {
      const matchesStatus = supportStatus === "ALL" || ticket.status === supportStatus;
      const matchesSource = supportSource === "ALL" || ticket.source === supportSource;
      const matchesQuery = !normalized || [ticket.subject, ticket.message, ticket.userEmail, ticket.displayName, ticket.category]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(normalized));
      return matchesStatus && matchesSource && matchesQuery;
    });
  }, [supportQuery, supportSource, supportStatus, supportTickets]);

  const visibleAuditLogs = useMemo(() => {
    const normalized = activityQuery.trim().toLocaleLowerCase();
    if (!normalized) return auditLogs;
    return auditLogs.filter((log) =>
      [log.actionType, log.reason, log.adminEmail, log.targetUserId, log.targetEntityId]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(normalized))
    );
  }, [activityQuery, auditLogs]);

  const pendingScoreCount = analytics?.pendingScores ?? scores.filter((score) => score.status === "suspicious" || score.status === "pending_review").length;
  const openTicketCount = analytics?.openSupportTickets ?? supportTickets.filter((ticket) => ticket.status === "OPEN").length;
  const suspiciousUserCount = analytics?.suspiciousUsers ?? users.filter((user) => user.trustStatus === "SUSPICIOUS").length;
  const unverifiedUserCount = analytics?.unverifiedUsers ?? users.filter((user) => !user.emailVerifiedAt).length;
  const financialEventCount = analytics?.financialEvents30Days ?? financialTransactions.length;
  const activeUserCount = users.filter((user) => user.status === "ACTIVE").length;
  const bannedUserCount = users.filter((user) => user.status === "BANNED").length;
  const trustedUserCount = users.filter((user) => user.trustStatus === "TRUSTED").length;
  const restrictedUserCount = users.filter((user) => user.activeRestrictions.length > 0).length;
  const validScoreCount = scores.filter((score) => score.status === "valid").length;
  const rejectedScoreCount = scores.filter((score) => score.status === "rejected").length;
  const hiddenScoreCount = scores.filter((score) => score.status === "hidden").length;
  const answeredTicketCount = supportTickets.filter((ticket) => ticket.status === "ANSWERED").length;
  const closedTicketCount = supportTickets.filter((ticket) => ticket.status === "CLOSED").length;
  const appealTicketCount = supportTickets.filter((ticket) => ticket.category === "APPEAL" || ticket.category === "BAN_APPEAL").length;
  const completedFinancialCount = financialTransactions.filter((transaction) => transaction.status === "completed").length;
  const pendingFinancialCount = financialTransactions.filter((transaction) => transaction.status === "pending").length;
  const failedFinancialCount = financialTransactions.filter((transaction) => !["completed", "pending"].includes(transaction.status)).length;
  const providerCount = new Set(financialTransactions.map((transaction) => transaction.provider).filter(Boolean)).size;
  const idempotentCount = financialTransactions.filter((transaction) => Boolean(transaction.idempotencyKey)).length;
  const totalClientErrors = analytics?.activityTimeline.reduce((sum, row) => sum + row.clientErrors, 0) ?? 0;

  const priorityQueue = [
    {
      id: "scores",
      count: pendingScoreCount,
      tone: pendingScoreCount > 0 ? "danger" : "neutral",
      title: t("adminWorkspace.overview.priority.scoreTitle"),
      body: t("adminWorkspace.overview.priority.scoreBody"),
      action: () => {
        setScoreStatusFilter("review");
        setActiveSection("scores");
      }
    },
    {
      id: "support",
      count: openTicketCount,
      tone: openTicketCount > 0 ? "gold" : "neutral",
      title: t("adminWorkspace.overview.priority.supportTitle"),
      body: t("adminWorkspace.overview.priority.supportBody"),
      action: () => {
        setSupportStatus("OPEN");
        setActiveSection("support");
      }
    },
    {
      id: "users",
      count: suspiciousUserCount + unverifiedUserCount,
      tone: suspiciousUserCount > 0 ? "danger" : unverifiedUserCount > 0 ? "gold" : "neutral",
      title: t("adminWorkspace.overview.priority.userTitle"),
      body: t("adminWorkspace.overview.priority.userBody"),
      action: () => {
        setUserTrustFilter("SUSPICIOUS");
        setActiveSection("users");
      }
    }
  ];

  function markSectionLoaded(section: AdminSection) {
    setSectionLoaded((current) => ({ ...current, [section]: true }));
    setSectionUpdatedAt((current) => ({ ...current, [section]: new Date().toISOString() }));
  }

  async function runSectionLoad(section: AdminSection, loader: () => Promise<void>) {
    setSectionBusy((current) => ({ ...current, [section]: true }));
    setError("");
    try {
      await loader();
      markSectionLoaded(section);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setSectionBusy((current) => ({ ...current, [section]: false }));
    }
  }

  async function loadUsers(search = query) {
    await runSectionLoad("users", async () => {
      setUsers(await adminApi.users(search));
    });
  }

  async function loadSupportTickets(_status = supportStatus, _source = supportSource) {
    await runSectionLoad("support", async () => {
      setSupportTickets(await supportApi.adminTickets("ALL", "ALL"));
    });
  }

  async function loadOverview() {
    await runSectionLoad("overview", async () => {
      setAnalytics(await adminApi.analytics());
    });
  }

  async function loadScores() {
    await runSectionLoad("scores", async () => {
      const [scoreRows, userRows] = await Promise.all([adminApi.scores("all"), users.length ? Promise.resolve(users) : adminApi.users("")]);
      setScores(scoreRows);
      if (!users.length) {
        setUsers(userRows);
      }
    });
  }

  async function loadFinance() {
    await runSectionLoad("finance", async () => {
      setFinancialTransactions(await adminApi.financialTransactions());
    });
  }

  async function loadActivity() {
    await runSectionLoad("activity", async () => {
      const [logs, transfers] = await Promise.all([adminApi.auditLogs(), adminApi.guestTransfers()]);
      setAuditLogs(logs);
      setGuestTransfers(transfers);
    });
  }

  async function refreshActiveSection(section: AdminSection = activeSection) {
    if (section === "overview") {
      await loadOverview();
      return;
    }
    if (section === "users") {
      await loadUsers(query);
      return;
    }
    if (section === "scores") {
      await loadScores();
      return;
    }
    if (section === "support") {
      await loadSupportTickets(supportStatus, supportSource);
      return;
    }
    if (section === "finance") {
      await loadFinance();
      return;
    }
    await loadActivity();
  }

  async function copySupportEmail(email?: string) {
    if (!email) {
      return;
    }
    try {
      await navigator.clipboard.writeText(email);
      setNotice(t("admin.emailCopied"));
    } catch {
      setError(t("common.error"));
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    if (activeSection === "overview" && !sectionLoaded.overview && !sectionBusy.overview) {
      void loadOverview();
    }
    if (activeSection === "users" && !sectionLoaded.users && !sectionBusy.users) {
      void loadUsers("");
    }
    if (activeSection === "scores" && !sectionLoaded.scores && !sectionBusy.scores) {
      void loadScores();
    }
    if (activeSection === "support" && !sectionLoaded.support && !sectionBusy.support) {
      void loadSupportTickets();
    }
    if (activeSection === "finance" && !sectionLoaded.finance && !sectionBusy.finance) {
      void loadFinance();
    }
    if (activeSection === "activity" && !sectionLoaded.activity && !sectionBusy.activity) {
      void loadActivity();
    }
  }, [activeSection, sectionBusy.activity, sectionBusy.finance, sectionBusy.overview, sectionBusy.scores, sectionBusy.support, sectionBusy.users, sectionLoaded.activity, sectionLoaded.finance, sectionLoaded.overview, sectionLoaded.scores, sectionLoaded.support, sectionLoaded.users]);

  function openAction(type: AdminAction, user: AdminUserDto) {
    setAction({ type, user });
    setActionText(
      type === "thank"
        ? t("admin.defaultThanks")
        : type === "ban"
          ? t("admin.defaultBanReason")
          : type === "resetScores"
            ? t("adminExtra.defaultScoreResetReason")
            : t("admin.defaultUnbanReason")
    );
  }

  async function submitAction() {
    if (!action) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const updated =
        action.type === "ban"
          ? await adminApi.banUser(action.user.id, actionText)
          : action.type === "unban"
            ? await adminApi.unbanUser(action.user.id, actionText)
            : action.type === "resetScores"
              ? await adminApi.resetScores(action.user.id, actionText)
              : null;

      if (action.type === "thank") {
        await adminApi.thankUser(action.user.id, actionText);
        await loadUsers(query);
      } else if (updated) {
        setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      }

      setAction(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(user: AdminUserDto) {
    setBusy(true);
    setError("");
    try {
      const result = await adminApi.resetPassword(user.id);
      setTemporaryPassword({ user: result.user, value: result.temporaryPassword });
      setUsers((current) => current.map((item) => item.id === result.user.id ? result.user : item));
      await loadOverview();
      await loadActivity();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function setTrust(user: AdminUserDto, trusted: boolean) {
    setBusy(true);
    try {
      const updated = await adminApi.setTrust(user.id, trusted ? "TRUSTED" : "SUSPICIOUS", trusted ? t("adminExtra.trustedReason") : t("adminExtra.suspiciousReason"));
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      await loadOverview();
      await loadActivity();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function submitScoreAction() {
    if (!scoreAction) return;
    setBusy(true);
    try {
      const updated = await adminApi.moderateScore(scoreAction.score.id, scoreAction.status, scoreReason.trim());
      setScores((current) => current.map((score) => score.id === updated.id ? updated : score));
      setScoreAction(null);
      await loadOverview();
      await loadActivity();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function submitRestriction() {
    if (!restrictionUser) return;
    setBusy(true);
    try {
      const restriction = await adminApi.createRestriction(restrictionUser.id, { type: restrictionType, reason: restrictionReason.trim() });
      setUsers((current) => current.map((user) => user.id === restrictionUser.id ? { ...user, activeRestrictions: [restriction, ...user.activeRestrictions] } : user));
      setRestrictionUser(null);
      await loadOverview();
      await loadActivity();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function removeRestriction(user: AdminUserDto, restrictionId: string) {
    setBusy(true);
    try {
      await adminApi.removeRestriction(restrictionId, t("adminExtra.restrictionRemovedReason"));
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, activeRestrictions: item.activeRestrictions.filter((restriction) => restriction.id !== restrictionId) } : item));
      setSelectedUser((current) => current?.id === user.id ? { ...current, activeRestrictions: current.activeRestrictions.filter((restriction) => restriction.id !== restrictionId) } : current);
      await loadOverview();
      await loadActivity();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  function openSupportAction(ticket: SupportTicketDto, status: SupportTicketStatus) {
    setSupportAction({ ticket, status });
    setSupportResponse(ticket.adminResponse ?? "");
    setSupportInternalNote(ticket.internalNote ?? "");
    setSupportAppealStatus(ticket.appealStatus ?? "");
  }

  async function submitSupportAction() {
    if (!supportAction) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const updated = await supportApi.adminUpdateTicket(supportAction.ticket.id, {
        status: supportAction.status,
        adminResponse: supportResponse.trim() || supportAction.ticket.adminResponse || undefined,
        internalNote: supportInternalNote.trim() || undefined,
        appealStatus: supportAppealStatus || undefined
      });
      setSupportTickets((current) => current.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
      setSupportAction(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function resendEmailVerification(user: AdminUserDto) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await adminApi.resendEmailVerification(user.id);
      setUsers((current) => current.map((item) => (item.id === result.user.id ? result.user : item)));
      setNotice(result.emailSent ? t("admin.verificationEmailSent") : t("admin.verificationEmailFailed"));
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmailManually(user: AdminUserDto) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await adminApi.verifyEmailManually(user.id);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(t("admin.emailVerifiedManually"));
      setEmailVerificationUser(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const navigationItems = [
    { id: "overview" as const, label: t("adminWorkspace.tabs.overview"), icon: LayoutDashboard },
    { id: "users" as const, label: t("adminWorkspace.tabs.users"), icon: Users, count: suspiciousUserCount, urgent: suspiciousUserCount > 0 },
    { id: "scores" as const, label: t("adminWorkspace.tabs.scores"), icon: Trophy, count: pendingScoreCount, urgent: pendingScoreCount > 0 },
    { id: "support" as const, label: t("adminWorkspace.tabs.support"), icon: Inbox, count: openTicketCount, urgent: openTicketCount > 0 },
    { id: "finance" as const, label: t("adminWorkspace.tabs.finance"), icon: BadgeDollarSign, count: financialEventCount },
    { id: "activity" as const, label: t("adminWorkspace.tabs.activity"), icon: Activity, count: auditLogs.length }
  ];

  function formatFinancialAmount(transaction: FinancialTransactionDto) {
    const parts = [
      transaction.amountCoins ? `${transaction.amountCoins} ${t("game.coins")}` : "",
      transaction.amountGems ? `${transaction.amountGems} ${t("adminExtra.finance.gems")}` : "",
      transaction.amountTickets ? `${transaction.amountTickets} ${t("adminExtra.finance.tickets")}` : "",
      transaction.amountExtraLives ? `${transaction.amountExtraLives} ${t("adminExtra.finance.lives")}` : ""
    ].filter(Boolean);
    return parts.length ? parts.join(" | ") : t("adminExtra.finance.noAmount");
  }

  function renderUserActions(user: AdminUserDto) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {user.status === "BANNED" ? (
          <Button type="button" variant="secondary" onClick={() => openAction("unban", user)} icon={<ShieldCheck size={16} />}>
            {t("admin.unban")}
          </Button>
        ) : (
          <Button type="button" variant="danger" onClick={() => openAction("ban", user)} icon={<Ban size={16} />}>
            {t("admin.ban")}
          </Button>
        )}
        <details className="group min-w-40 rounded-md border border-white/10 bg-ink/80">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-bold text-slate-200 marker:content-none">
            <span className="inline-flex items-center gap-2"><UserRoundCog size={16} />{t("adminWorkspace.moreActions")}</span>
            <ChevronDown size={15} className="transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-1 border-t border-white/10 p-2">
            <button type="button" onClick={() => setSelectedUser(user)} className="admin-action"><Eye size={16} />{t("adminWorkspace.users.viewDetails")}</button>
            <button type="button" onClick={() => openAction("thank", user)} className="admin-action"><HeartHandshake size={16} />{t("admin.thank")}</button>
            <button type="button" disabled={busy} onClick={() => void resetPassword(user)} className="admin-action"><KeyRound size={16} />{t("adminExtra.resetPassword")}</button>
            <button type="button" onClick={() => openAction("resetScores", user)} className="admin-action"><Trophy size={16} />{t("adminExtra.resetScores")}</button>
            <button type="button" onClick={() => void setTrust(user, user.trustStatus !== "TRUSTED")} className="admin-action"><ClipboardCheck size={16} />{user.trustStatus === "TRUSTED" ? t("adminExtra.markSuspicious") : t("adminExtra.markTrusted")}</button>
            <button type="button" onClick={() => { setRestrictionUser(user); setRestrictionReason(""); }} className="admin-action"><ShieldAlert size={16} />{t("adminExtra.restrict")}</button>
            {!user.emailVerifiedAt ? (
              <>
                <button type="button" disabled={busy} onClick={() => void resendEmailVerification(user)} className="admin-action"><Send size={16} />{t("admin.resendVerification")}</button>
                <button type="button" disabled={busy} onClick={() => setEmailVerificationUser(user)} className="admin-action"><MailCheck size={16} />{t("admin.verifyEmailManually")}</button>
              </>
            ) : null}
          </div>
        </details>
      </div>
    );
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
            <ShieldCheck size={17} />
            {t("nav.admin")}
          </div>
          <h1 className="text-3xl font-black text-white neon-text sm:text-4xl">{t("admin.title")}</h1>
          <p className="mt-2 max-w-3xl text-slate-300">{t("admin.subtitle")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || sectionBusy[activeSection]}
          icon={<RefreshCw size={17} className={busy || sectionBusy[activeSection] ? "animate-spin" : ""} />}
          onClick={() => void refreshActiveSection()}
        >
          {t("adminWorkspace.refreshCurrent")}
        </Button>
      </div>

      <AdminNavigation active={activeSection} items={navigationItems} onChange={setActiveSection} />

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full border border-white/10 px-2.5 py-1">{t("adminWorkspace.activeSectionLabel", { section: t(`adminWorkspace.tabs.${activeSection}`) })}</span>
        {sectionBusy[activeSection] ? <span className="rounded-full border border-cyanGlow/20 px-2.5 py-1 text-cyanGlow">{t("common.loading")}</span> : null}
        {sectionUpdatedAt[activeSection] ? <span>{t("adminWorkspace.generatedAt", { date: new Date(sectionUpdatedAt[activeSection]!).toLocaleString() })}</span> : null}
      </div>

      {error ? <div role="alert" className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}
      {notice ? <div role="status" className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm text-cyanGlow">{notice}</div> : null}

      {activeSection === "overview" ? (
        <div className="grid gap-6">
          <section className="arcade-border rounded-lg p-5">
            <AdminSectionHeader
              title={t("adminWorkspace.overview.title")}
              description={t("adminWorkspace.overview.description")}
              icon={LayoutDashboard}
            />
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <AdminMetricCard label={t("adminWorkspace.overview.openTickets")} value={openTicketCount} detail={t("adminWorkspace.overview.requiresAttention")} icon={Inbox} tone={openTicketCount ? "danger" : "cyan"} onClick={() => setActiveSection("support")} />
              <AdminMetricCard label={t("adminWorkspace.overview.scoresToReview")} value={pendingScoreCount} detail={t("adminWorkspace.overview.antiCheatQueue")} icon={ShieldAlert} tone={pendingScoreCount ? "danger" : "cyan"} onClick={() => setActiveSection("scores")} />
              <AdminMetricCard label={t("adminWorkspace.overview.suspiciousUsers")} value={suspiciousUserCount} detail={t("adminWorkspace.overview.flaggedAccounts")} icon={CircleAlert} tone={suspiciousUserCount ? "gold" : "cyan"} onClick={() => { setUserTrustFilter("SUSPICIOUS"); setActiveSection("users"); }} />
              <AdminMetricCard label={t("adminWorkspace.overview.financialEvents")} value={financialEventCount} detail={t("adminWorkspace.overview.financialJournal")} icon={BadgeDollarSign} tone="gold" onClick={() => setActiveSection("finance")} />
              <AdminMetricCard label={t("adminWorkspace.overview.unverifiedUsers")} value={unverifiedUserCount} detail={t("adminWorkspace.overview.emailQueue")} icon={MailCheck} tone="neutral" onClick={() => setActiveSection("users")} />
            </div>
            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{t("adminWorkspace.overview.priorityTitle")}</div>
                  <p className="mt-1 text-sm text-slate-400">{t("adminWorkspace.overview.priorityDescription")}</p>
                </div>
                <div className="text-xs text-slate-500">{t("adminWorkspace.generatedAt", { date: new Date().toLocaleString() })}</div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {priorityQueue.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    className={`rounded-lg border p-4 text-left transition hover:-translate-y-0.5 ${
                      item.tone === "danger"
                        ? "border-magentaGlow/30 bg-magentaGlow/10"
                        : item.tone === "gold"
                          ? "border-goldGlow/25 bg-goldGlow/10"
                          : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{item.title}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        item.tone === "danger"
                          ? "bg-magentaGlow text-white"
                          : item.tone === "gold"
                            ? "bg-goldGlow text-ink"
                            : "bg-white/10 text-slate-200"
                      }`}>
                        {item.count}
                      </span>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{item.body}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <button type="button" onClick={() => { setScoreStatusFilter("review"); setActiveSection("scores"); }} className="rounded-lg border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyanGlow hover:bg-white/10">
                <div className="text-xs font-black uppercase text-slate-500">{t("adminWorkspace.overview.scoreDesk")}</div>
                <div className="mt-2 text-base font-black text-white">{t("adminWorkspace.overview.reviewSuspiciousScores")}</div>
                <p className="mt-1 text-sm leading-6 text-slate-400">{t("adminWorkspace.overview.scoreDeskBody")}</p>
              </button>
              <button type="button" onClick={() => { setSupportStatus("OPEN"); setActiveSection("support"); }} className="rounded-lg border border-white/10 bg-white/5 p-4 text-left transition hover:border-goldGlow hover:bg-white/10">
                <div className="text-xs font-black uppercase text-slate-500">{t("adminWorkspace.overview.supportDesk")}</div>
                <div className="mt-2 text-base font-black text-white">{t("adminWorkspace.overview.replyToPlayers")}</div>
                <p className="mt-1 text-sm leading-6 text-slate-400">{t("adminWorkspace.overview.supportDeskBody")}</p>
              </button>
              <button type="button" onClick={() => { setUserStatusFilter("ACTIVE"); setUserTrustFilter("SUSPICIOUS"); setActiveSection("users"); }} className="rounded-lg border border-white/10 bg-white/5 p-4 text-left transition hover:border-magentaGlow hover:bg-white/10">
                <div className="text-xs font-black uppercase text-slate-500">{t("adminWorkspace.overview.riskDesk")}</div>
                <div className="mt-2 text-base font-black text-white">{t("adminWorkspace.overview.reviewRiskAccounts")}</div>
                <p className="mt-1 text-sm leading-6 text-slate-400">{t("adminWorkspace.overview.riskDeskBody")}</p>
              </button>
            </div>
          </section>

          {analytics ? (
            <section className="arcade-border rounded-lg p-5" aria-label={t("adminExtra.analytics.title")}>
              <AdminSectionHeader title={t("adminExtra.analytics.title")} description={t("adminWorkspace.analyticsDescription")} icon={BarChart3} />
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  [t("adminExtra.analytics.registered"), analytics.registeredUsers],
                  [t("adminExtra.analytics.new7d"), analytics.registeredLast7Days],
                  [t("adminExtra.analytics.active7d"), analytics.activePlayers7Days],
                  [t("adminExtra.analytics.returning7d"), analytics.returningPlayers7Days],
                  [t("adminExtra.analytics.sessions30d"), analytics.gameSessions30Days],
                  [t("adminExtra.analytics.validScores30d"), analytics.validScores30Days],
                  [t("adminExtra.analytics.adViews30d"), analytics.completedAdViews30Days],
                  [t("adminExtra.analytics.guests30d"), analytics.guestUsers30Days]
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-md border border-white/10 bg-white/5 p-3">
                    <div className="text-xs font-black uppercase text-slate-400">{label}</div>
                    <div className="mt-1 text-2xl font-black text-white">{value}</div>
                  </div>
                ))}
              </div>
              <AdminActivityChart rows={analytics.activityTimeline} />
              <div className="mt-4 text-xs text-slate-500">{t("adminWorkspace.generatedAt", { date: new Date(analytics.generatedAt).toLocaleString() })}</div>
            </section>
          ) : null}
        </div>
      ) : null}

      {activeSection === "users" ? (
      <section className="grid gap-4">
        <div className="arcade-border rounded-lg p-4 sm:p-5">
          <AdminSectionHeader title={t("adminWorkspace.users.title")} description={t("adminWorkspace.users.description")} icon={Users} action={<Button type="button" variant="ghost" disabled={sectionBusy.users} icon={<RefreshCw size={16} className={sectionBusy.users ? "animate-spin" : ""} />} onClick={() => void loadUsers(query)}>{t("admin.refresh")}</Button>} />

      <form
        className="mt-4 grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_auto_auto_auto] lg:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void loadUsers(query);
        }}
      >
        <Input label={t("admin.search")} value={query} onChange={(event) => setQuery(event.target.value)} className="w-full" />
        <label className="grid gap-2 text-sm text-slate-300">
          <span>{t("adminWorkspace.users.statusFilter")}</span>
          <select value={userStatusFilter} onChange={(event) => setUserStatusFilter(event.target.value as typeof userStatusFilter)} className="min-h-11 rounded-md border border-slate-700 bg-ink/70 px-3 text-white">
            <option value="ALL">{t("adminExtra.ticketStatuses.ALL")}</option>
            <option value="ACTIVE">{t("adminExtra.userStatuses.ACTIVE")}</option>
            <option value="BANNED">{t("adminExtra.userStatuses.BANNED")}</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-300">
          <span>{t("adminWorkspace.users.trustFilter")}</span>
          <select value={userTrustFilter} onChange={(event) => setUserTrustFilter(event.target.value as typeof userTrustFilter)} className="min-h-11 rounded-md border border-slate-700 bg-ink/70 px-3 text-white">
            <option value="ALL">{t("adminExtra.ticketStatuses.ALL")}</option>
            <option value="NORMAL">{t("adminExtra.trustStatuses.NORMAL")}</option>
            <option value="TRUSTED">{t("adminExtra.trustStatuses.TRUSTED")}</option>
            <option value="SUSPICIOUS">{t("adminExtra.trustStatuses.SUSPICIOUS")}</option>
          </select>
        </label>
        <Button type="submit" disabled={busy || sectionBusy.users} icon={<Search size={18} />}>
          {t("admin.searchButton")}
        </Button>
      </form>

          <div className="mt-3 text-xs text-slate-400">{t("adminWorkspace.users.results", { count: filteredUsers.length })}</div>
        </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard label={t("adminWorkspace.users.summary.active")} value={activeUserCount} icon={Users} tone="cyan" />
        <AdminMetricCard label={t("adminWorkspace.users.summary.banned")} value={bannedUserCount} icon={Ban} tone={bannedUserCount ? "danger" : "neutral"} />
        <AdminMetricCard label={t("adminWorkspace.users.summary.suspicious")} value={suspiciousUserCount} icon={CircleAlert} tone={suspiciousUserCount ? "danger" : "gold"} />
        <AdminMetricCard label={t("adminWorkspace.users.summary.trusted")} value={trustedUserCount} icon={ShieldCheck} tone="cyan" />
        <AdminMetricCard label={t("adminWorkspace.users.summary.restricted")} value={restrictedUserCount} icon={ShieldAlert} tone={restrictedUserCount ? "gold" : "neutral"} />
      </div>

      <div className="arcade-border overflow-hidden rounded-lg">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[58rem] text-left text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="p-4">{t("admin.player")}</th>
                <th className="p-4">{t("admin.status")}</th>
                <th className="p-4">{t("admin.score")}</th>
                <th className="p-4">{t("admin.coins")}</th>
                <th className="p-4">{t("admin.lastAction")}</th>
                <th className="p-4">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-white/5 align-top transition hover:bg-white/[0.03]">
                  <td className="p-4">
                    <div className="font-bold text-white">{user.displayName}</div>
                    <div className="text-xs text-slate-400">{user.email}</div>
                    <div className={`mt-1 text-xs font-bold ${user.emailVerifiedAt ? "text-cyanGlow" : "text-goldGlow"}`}>
                      {user.emailVerifiedAt ? t("admin.emailVerified") : t("admin.emailUnverified")}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-black ${
                        user.status === "BANNED" ? "bg-magentaGlow/20 text-pink-200" : "bg-cyanGlow/15 text-cyanGlow"
                      }`}
                    >
                      {t(`adminExtra.userStatuses.${user.status}`, user.status)}
                    </span>
                    {user.banReason ? <div className="mt-2 max-w-xs text-xs text-slate-400">{user.banReason}</div> : null}
                    <div className="mt-2 text-xs font-black text-goldGlow">{t(`adminExtra.trustStatuses.${user.trustStatus}`, user.trustStatus)}</div>
                    {user.activeRestrictions.length ? <div className="mt-1 text-xs text-pink-200">{t("adminExtra.activeRestrictions", { count: user.activeRestrictions.length })}</div> : null}
                    {user.activeRestrictions.map((restriction) => <button key={restriction.id} type="button" disabled={busy} onClick={() => void removeRestriction(user, restriction.id)} className="mt-1 block text-xs font-bold text-cyanGlow hover:text-white">{t("adminExtra.removeRestriction", { type: t(`restrictions.types.${restriction.type}`, restriction.type.replaceAll("_", " ")) })}</button>)}
                  </td>
                  <td className="p-4 font-bold text-white">{user.highScore}</td>
                  <td className="p-4 text-goldGlow">{user.coins}</td>
                  <td className="p-4 text-slate-300">{user.lastAction?.action ?? "-"}</td>
                  <td className="p-4">
                    {renderUserActions(user)}
                  </td>
                </tr>
              ))}
              {!filteredUsers.length ? (
                <tr>
                  <td className="p-4 text-slate-400" colSpan={6}>
                    {busy ? t("common.loading") : t("admin.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {filteredUsers.map((user) => (
            <article key={user.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-black text-white">{user.displayName}</div>
                  <div className="mt-1 break-all text-xs text-slate-400">{user.email}</div>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-black ${user.status === "BANNED" ? "bg-magentaGlow/20 text-pink-200" : "bg-cyanGlow/15 text-cyanGlow"}`}>
                  {t(`adminExtra.userStatuses.${user.status}`, user.status)}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-ink/60 p-3"><div className="text-xs text-slate-500">{t("admin.score")}</div><strong className="text-white">{user.highScore}</strong></div>
                <div className="rounded-md bg-ink/60 p-3"><div className="text-xs text-slate-500">{t("admin.coins")}</div><strong className="text-goldGlow">{user.coins}</strong></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={user.emailVerifiedAt ? "text-cyanGlow" : "text-goldGlow"}>{user.emailVerifiedAt ? t("admin.emailVerified") : t("admin.emailUnverified")}</span>
                <span className="text-slate-600">|</span>
                <span className={user.trustStatus === "SUSPICIOUS" ? "text-pink-200" : "text-slate-300"}>{t(`adminExtra.trustStatuses.${user.trustStatus}`, user.trustStatus)}</span>
              </div>
              {user.banReason ? <p className="mt-3 rounded-md bg-magentaGlow/10 p-2 text-xs text-pink-100">{user.banReason}</p> : null}
              {user.activeRestrictions.length ? <p className="mt-2 text-xs text-pink-200">{t("adminExtra.activeRestrictions", { count: user.activeRestrictions.length })}</p> : null}
              <div className="mt-4">{renderUserActions(user)}</div>
            </article>
          ))}
          {!filteredUsers.length ? <AdminEmptyState icon={Users} title={busy ? t("common.loading") : t("admin.empty")} description={t("adminWorkspace.users.emptyHint")} /> : null}
        </div>
      </div>
      </section>
      ) : null}

      {activeSection === "scores" ? (
      <div className="arcade-border rounded-lg p-4 sm:p-5">
        <AdminSectionHeader
          title={t("adminExtra.scoreModeration")}
          description={t("adminWorkspace.scores.description")}
          icon={Trophy}
          action={<Button type="button" variant="ghost" disabled={sectionBusy.scores} icon={<RefreshCw size={16} className={sectionBusy.scores ? "animate-spin" : ""} />} onClick={() => void loadScores()}>{t("admin.refresh")}</Button>}
        />
        <div className="my-4 flex gap-2 overflow-x-auto pb-1">
          {(["review", "all", "valid", "suspicious", "pending_review", "rejected", "hidden"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setScoreStatusFilter(status)}
              className={`min-h-10 shrink-0 rounded-md border px-3 text-xs font-black transition ${scoreStatusFilter === status ? "border-cyanGlow bg-cyanGlow text-ink" : "border-white/10 bg-white/5 text-slate-300 hover:border-cyanGlow"}`}
            >
              {t(`adminWorkspace.scores.filters.${status}`)}
            </button>
          ))}
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label={t("adminWorkspace.scores.summary.review")} value={pendingScoreCount} icon={ShieldAlert} tone={pendingScoreCount ? "danger" : "neutral"} />
          <AdminMetricCard label={t("adminWorkspace.scores.summary.valid")} value={validScoreCount} icon={CheckCircle2} tone="cyan" />
          <AdminMetricCard label={t("adminWorkspace.scores.summary.rejected")} value={rejectedScoreCount} icon={Ban} tone={rejectedScoreCount ? "gold" : "neutral"} />
          <AdminMetricCard label={t("adminWorkspace.scores.summary.hidden")} value={hiddenScoreCount} icon={Eye} tone={hiddenScoreCount ? "gold" : "neutral"} />
        </div>
        <div className="grid gap-3">
          {visibleScores.map((score) => (
            <article key={score.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="font-black text-white">{score.displayName} | {score.score}</div><div className="mt-1 text-xs text-slate-400">{t(`adminExtra.scoreStatuses.${score.status}`, score.status)} | {score.durationMs} {t("adminExtra.ms")} | {t("game.distance")} {score.distance}</div></div>
                <span className="rounded-md bg-magentaGlow/15 px-2 py-1 text-xs font-black text-pink-200">{t(`adminExtra.scoreStatuses.${score.status}`, score.status)}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{t("admin.reason")}: {score.reviewReason || t("adminExtra.noReasonRecorded")}</p>
              {score.session ? <div className="mt-2 text-xs text-slate-500">{t("game.coins")} {score.session.coinsCollected} | {t("adminExtra.hits")} {score.session.obstacleHits} | {score.session.antiCheatNotes || t("adminExtra.noSessionFlags")}</div> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => { setScoreAction({ score, status: "valid" }); setScoreReason(t("adminExtra.scoreApprovedReason")); }}>{t("adminExtra.approve")}</Button>
                <Button type="button" variant="danger" onClick={() => { setScoreAction({ score, status: "rejected" }); setScoreReason(score.reviewReason || t("adminExtra.scoreRejectedReason")); }}>{t("adminExtra.reject")}</Button>
                <Button type="button" variant="ghost" onClick={() => { setScoreAction({ score, status: "hidden" }); setScoreReason(t("adminExtra.scoreHiddenReason")); }}>{t("adminExtra.hide")}</Button>
                {users.find((user) => user.id === score.userId) ? <Button type="button" variant="danger" onClick={() => { const target = users.find((user) => user.id === score.userId); if (target) { openAction("ban", target); setActionText(t("adminExtra.cheatingReason", { reason: score.reviewReason || t("adminExtra.invalidScore") })); } }}>{t("adminExtra.banForCheating")}</Button> : null}
              </div>
            </article>
          ))}
          {!visibleScores.length ? <AdminEmptyState icon={CheckCircle2} title={t("adminExtra.noScoresToReview")} description={t("adminWorkspace.scores.emptyHint")} /> : null}
        </div>
      </div>
      ) : null}

      {activeSection === "finance" ? (
      <div className="arcade-border rounded-lg p-4 sm:p-5">
        <AdminSectionHeader
          title={t("adminExtra.finance.title")}
          description={t("adminWorkspace.finance.description")}
          icon={BadgeDollarSign}
          action={<Button type="button" variant="ghost" disabled={sectionBusy.finance} icon={<RefreshCw size={16} className={sectionBusy.finance ? "animate-spin" : ""} />} onClick={() => void loadFinance()}>{t("admin.refresh")}</Button>}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <AdminMetricCard label={t("adminWorkspace.finance.summary.completed")} value={completedFinancialCount} icon={BadgeDollarSign} tone="cyan" />
          <AdminMetricCard label={t("adminWorkspace.finance.summary.pending")} value={pendingFinancialCount} icon={CircleAlert} tone={pendingFinancialCount ? "gold" : "neutral"} />
          <AdminMetricCard label={t("adminWorkspace.finance.summary.failed")} value={failedFinancialCount} icon={Ban} tone={failedFinancialCount ? "danger" : "neutral"} />
          <AdminMetricCard label={t("adminWorkspace.finance.summary.providers")} value={providerCount} icon={Activity} tone="neutral" />
          <AdminMetricCard label={t("adminWorkspace.finance.summary.idempotent")} value={idempotentCount} icon={ClipboardCheck} tone="gold" />
        </div>
        <div className="mt-4 overflow-x-auto md:block hidden">
          <table className="w-full min-w-[62rem] text-left text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="p-3">{t("adminExtra.finance.user")}</th>
                <th className="p-3">{t("adminExtra.finance.item")}</th>
                <th className="p-3">{t("adminExtra.finance.status")}</th>
                <th className="p-3">{t("adminExtra.finance.provider")}</th>
                <th className="p-3">{t("adminExtra.finance.amount")}</th>
                <th className="p-3">{t("adminExtra.finance.date")}</th>
              </tr>
            </thead>
            <tbody>
              {financialTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-white/5 align-top transition hover:bg-white/[0.03]">
                  <td className="p-3">
                    <div className="font-black text-white">{transaction.displayName}</div>
                    <div className="break-all text-xs text-slate-500">{transaction.userEmail}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-100">{transaction.productLabel}</div>
                    <div className="text-xs text-slate-500">{transaction.type}</div>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-black ${transaction.status === "completed" ? "bg-cyanGlow/15 text-cyanGlow" : transaction.status === "pending" ? "bg-goldGlow/15 text-goldGlow" : "bg-magentaGlow/15 text-pink-200"}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{transaction.provider}</td>
                  <td className="p-3 font-bold text-goldGlow">{formatFinancialAmount(transaction)}</td>
                  <td className="p-3">
                    <div className="text-slate-300">{new Date(transaction.createdAt).toLocaleString()}</div>
                    <div className="mt-1 break-all text-[11px] text-slate-600">{t("adminExtra.finance.idempotencyKey")}: {transaction.idempotencyKey ?? "-"}</div>
                  </td>
                </tr>
              ))}
              {!financialTransactions.length ? (
                <tr>
                  <td className="p-4" colSpan={6}>
                    <AdminEmptyState icon={BadgeDollarSign} title={t("adminExtra.finance.empty")} />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 md:hidden">
          {financialTransactions.map((transaction) => (
            <article key={transaction.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black text-white">{transaction.productLabel}</div>
                  <div className="mt-1 text-xs text-slate-500">{transaction.provider}</div>
                </div>
                <span className={`rounded-md px-2 py-1 text-[11px] font-black ${transaction.status === "completed" ? "bg-cyanGlow/15 text-cyanGlow" : transaction.status === "pending" ? "bg-goldGlow/15 text-goldGlow" : "bg-magentaGlow/15 text-pink-200"}`}>{transaction.status}</span>
              </div>
              <div className="mt-3 rounded-md bg-ink/60 p-3 text-sm">
                <div className="font-bold text-white">{transaction.displayName}</div>
                <div className="mt-1 break-all text-xs text-slate-500">{transaction.userEmail}</div>
                <div className="mt-3 text-goldGlow">{formatFinancialAmount(transaction)}</div>
              </div>
              <div className="mt-3 text-xs text-slate-500">{new Date(transaction.createdAt).toLocaleString()}</div>
            </article>
          ))}
          {!financialTransactions.length ? <AdminEmptyState icon={BadgeDollarSign} title={t("adminExtra.finance.empty")} /> : null}
        </div>
      </div>
      ) : null}

      {activeSection === "activity" ? (
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="arcade-border rounded-lg p-4 sm:p-5">
          <AdminSectionHeader title={t("adminExtra.auditLog")} description={t("adminWorkspace.activity.auditDescription")} icon={History} action={<Button type="button" variant="ghost" disabled={sectionBusy.activity} icon={<RefreshCw size={16} className={sectionBusy.activity ? "animate-spin" : ""} />} onClick={() => void loadActivity()}>{t("admin.refresh")}</Button>} />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <AdminMetricCard label={t("adminWorkspace.activity.summary.audit")} value={auditLogs.length} icon={History} tone="neutral" />
            <AdminMetricCard label={t("adminWorkspace.activity.summary.transfers")} value={guestTransfers.length} icon={Activity} tone="gold" />
            <AdminMetricCard label={t("adminWorkspace.activity.summary.errors")} value={totalClientErrors} icon={CircleAlert} tone={totalClientErrors ? "danger" : "neutral"} />
          </div>
          <div className="mt-4"><Input label={t("adminWorkspace.activity.search")} value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} placeholder={t("adminWorkspace.activity.searchPlaceholder")} /></div>
          <div className="mt-4 grid max-h-[32rem] gap-2 overflow-y-auto pr-2">
            {visibleAuditLogs.map((log) => <div key={log.id} className="rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300"><strong className="text-white">{t(`adminExtra.auditActions.${log.actionType}`, log.actionType)}</strong><div>{log.reason || t("adminExtra.noReason")}</div><div className="text-slate-500">{new Date(log.createdAt).toLocaleString()} | {log.adminEmail || t("adminExtra.system")}</div></div>)}
            {!visibleAuditLogs.length ? <AdminEmptyState icon={History} title={t("adminWorkspace.activity.noAudit")} /> : null}
          </div>
        </div>
        <div className="arcade-border rounded-lg p-4 sm:p-5">
          <AdminSectionHeader title={t("adminExtra.guestTransfers")} description={t("adminWorkspace.activity.transferDescription")} icon={Activity} />
          <div className="mt-4 grid max-h-[32rem] gap-2 overflow-y-auto pr-2">
            {guestTransfers.map((transfer) => <div key={transfer.id} className="rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300"><strong className="text-white">{t(`adminExtra.transferStatuses.${transfer.status}`, transfer.status)}</strong> | {t("adminExtra.localScore")} {transfer.bestScore} | {t("adminExtra.transferredScore")} {transfer.transferredScore}<div>{transfer.reason || t("adminExtra.passedValidation")}</div><div className="text-slate-500">{new Date(transfer.createdAt).toLocaleString()}</div></div>)}
            {!guestTransfers.length ? <div className="text-sm text-slate-400">{t("adminExtra.noTransfers")}</div> : null}
          </div>
        </div>
      </div>
      ) : null}

      {activeSection === "support" ? (
      <div className="arcade-border rounded-lg p-4 sm:p-5">
        <AdminSectionHeader
          title={t("admin.supportInbox")}
          description={t("adminWorkspace.support.description")}
          icon={Inbox}
          action={<Button type="button" variant="ghost" disabled={sectionBusy.support} icon={<RefreshCw size={16} className={sectionBusy.support ? "animate-spin" : ""} />} onClick={() => void loadSupportTickets(supportStatus, supportSource)}>{t("admin.refresh")}</Button>}
        />
        <div className="mt-4"><Input label={t("adminWorkspace.support.search")} value={supportQuery} onChange={(event) => setSupportQuery(event.target.value)} placeholder={t("adminWorkspace.support.searchPlaceholder")} /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label={t("adminWorkspace.support.summary.open")} value={openTicketCount} icon={Inbox} tone={openTicketCount ? "danger" : "neutral"} />
          <AdminMetricCard label={t("adminWorkspace.support.summary.answered")} value={answeredTicketCount} icon={Send} tone="cyan" />
          <AdminMetricCard label={t("adminWorkspace.support.summary.closed")} value={closedTicketCount} icon={CheckCircle2} tone="neutral" />
          <AdminMetricCard label={t("adminWorkspace.support.summary.appeals")} value={appealTicketCount} icon={ShieldAlert} tone={appealTicketCount ? "gold" : "neutral"} />
        </div>
        <div className="mb-4 mt-4 flex flex-wrap gap-2">
          {(["ALL", "OPEN", "ANSWERED", "CLOSED"] as Array<SupportTicketStatus | "ALL">).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSupportStatus(status)}
              className={`rounded-md border px-3 py-2 text-xs font-black transition ${
                supportStatus === status
                  ? "border-cyanGlow bg-cyanGlow text-ink"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-cyanGlow"
              }`}
            >
              {t(`adminExtra.ticketStatuses.${status}`, status)}
            </button>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {(["ALL", "GUEST", "ACCOUNT"] as Array<SupportTicketSource | "ALL">).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => setSupportSource(source)}
              className={`rounded-md border px-3 py-2 text-xs font-black transition ${
                supportSource === source
                  ? "border-goldGlow bg-goldGlow text-ink"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-goldGlow"
              }`}
            >
              {t(`admin.ticketSources.${source}`)}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {visibleSupportTickets.map((ticket) => (
            <article key={ticket.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-black text-white">{ticket.subject}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {ticket.displayName} | {ticket.userEmail} | {t(`support.categories.${ticket.category}`)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md bg-goldGlow/15 px-2 py-1 text-xs font-black text-goldGlow">
                    {t(`admin.ticketSources.${ticket.source}`)}
                  </span>
                  <span className="rounded-md bg-cyanGlow/15 px-2 py-1 text-xs font-black text-cyanGlow">{t(`adminExtra.ticketStatuses.${ticket.status}`, ticket.status)}</span>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{ticket.message}</p>
              {ticket.relatedEntityId ? <div className="mt-2 text-xs font-bold text-goldGlow">{t("adminExtra.related")}: {ticket.relatedEntityId}</div> : null}
              {ticket.appealStatus ? <div className="mt-2 text-xs font-black text-cyanGlow">{t("adminExtra.appeal")}: {t(`adminExtra.appealStatuses.${ticket.appealStatus}`, ticket.appealStatus)}</div> : null}
              {ticket.adminResponse ? (
                <div className="mt-3 rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm text-slate-100">{ticket.adminResponse}</div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {ticket.userEmail ? (
                  <Button type="button" variant="ghost" onClick={() => void copySupportEmail(ticket.userEmail)} icon={<Copy size={16} />}>
                    {t("admin.copyEmail")}
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={() => openSupportAction(ticket, "ANSWERED")}>
                  {t("admin.reply")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => openSupportAction(ticket, "CLOSED")}>
                  {t("admin.closeTicket")}
                </Button>
              </div>
            </article>
          ))}
          {!visibleSupportTickets.length ? <AdminEmptyState icon={Inbox} title={t("admin.noTickets")} description={t("adminWorkspace.support.emptyHint")} /> : null}
        </div>
      </div>
      ) : null}

      {selectedUser ? (
        <Modal title={t("adminWorkspace.users.playerDetails")} closeLabel={t("common.close")} onClose={() => setSelectedUser(null)}>
          <div className="grid gap-4">
            <div className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="min-w-0">
                <div className="text-xl font-black text-white">{selectedUser.displayName}</div>
                <div className="mt-1 break-all text-sm text-slate-400">{selectedUser.email}</div>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${selectedUser.status === "BANNED" ? "bg-magentaGlow/20 text-pink-200" : "bg-cyanGlow/15 text-cyanGlow"}`}>
                {t(`adminExtra.userStatuses.${selectedUser.status}`, selectedUser.status)}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {[
                [t("adminWorkspace.users.fields.userId"), selectedUser.id],
                [t("adminWorkspace.users.fields.role"), selectedUser.role],
                [t("adminWorkspace.users.fields.created"), new Date(selectedUser.createdAt).toLocaleString()],
                [t("adminWorkspace.users.fields.trust"), t(`adminExtra.trustStatuses.${selectedUser.trustStatus}`, selectedUser.trustStatus)],
                [t("admin.score"), selectedUser.highScore],
                [t("admin.coins"), selectedUser.coins],
                [t("adminWorkspace.users.fields.email"), selectedUser.emailVerifiedAt ? t("admin.emailVerified") : t("admin.emailUnverified")],
                [t("adminWorkspace.users.fields.passwordChanged"), new Date(selectedUser.lastPasswordChangeAt).toLocaleString()],
                [t("adminWorkspace.users.fields.forcePasswordChange"), selectedUser.mustChangePassword ? t("adminWorkspace.yes") : t("adminWorkspace.no")],
                [t("admin.lastAction"), selectedUser.lastAction ? t(`adminExtra.auditActions.${selectedUser.lastAction.action}`, selectedUser.lastAction.action) : "-"]
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-md border border-white/10 bg-ink/60 p-3">
                  <dt className="text-xs font-bold text-slate-500">{label}</dt>
                  <dd className="mt-1 break-all font-bold text-slate-100">{value}</dd>
                </div>
              ))}
            </dl>
            <section>
              <h3 className="font-black text-white">{t("adminWorkspace.users.fields.restrictions")}</h3>
              <div className="mt-2 grid gap-2">
                {selectedUser.activeRestrictions.map((restriction) => (
                  <div key={restriction.id} className="rounded-md border border-magentaGlow/20 bg-magentaGlow/5 p-3 text-sm text-slate-300">
                    <div className="font-black text-pink-200">{t(`restrictions.types.${restriction.type}`, restriction.type.replaceAll("_", " "))}</div>
                    <div className="mt-1">{restriction.reason}</div>
                    <button type="button" disabled={busy} onClick={() => void removeRestriction(selectedUser, restriction.id)} className="mt-2 text-xs font-black text-cyanGlow hover:text-white">
                      {t("adminWorkspace.users.removeThisRestriction")}
                    </button>
                  </div>
                ))}
                {!selectedUser.activeRestrictions.length ? <div className="rounded-md bg-white/5 p-3 text-sm text-slate-400">{t("adminWorkspace.users.noRestrictions")}</div> : null}
              </div>
            </section>
            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
              <Button type="button" variant="ghost" icon={<Copy size={16} />} onClick={() => void copySupportEmail(selectedUser.email)}>{t("admin.copyEmail")}</Button>
              {selectedUser.status === "BANNED" ? (
                <Button type="button" variant="secondary" icon={<ShieldCheck size={16} />} onClick={() => { openAction("unban", selectedUser); setSelectedUser(null); }}>{t("admin.unban")}</Button>
              ) : (
                <Button type="button" variant="danger" icon={<Ban size={16} />} onClick={() => { openAction("ban", selectedUser); setSelectedUser(null); }}>{t("admin.ban")}</Button>
              )}
            </div>
          </div>
        </Modal>
      ) : null}

      {action ? (
        <Modal title={actionTitle} closeLabel={t("common.close")} onClose={() => setAction(null)}>
          <div className="grid gap-4">
            <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <ShieldOff size={18} className="text-cyanGlow" />
              <span>{action.user.displayName}</span>
            </div>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{action.type === "thank" ? t("admin.message") : t("admin.reason")}</span>
              {action.type === "ban" ? (
                <div className="grid grid-cols-2 gap-2">
                  {banReasonKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActionText(t(`admin.banReasons.${key}`))}
                      className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-bold text-slate-300 hover:border-cyanGlow hover:text-white"
                    >
                      {t(`admin.banReasons.${key}`)}
                    </button>
                  ))}
                </div>
              ) : null}
              <textarea
                value={actionText}
                onChange={(event) => setActionText(event.target.value)}
                rows={5}
                className="rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-cyanGlow focus:ring-2 focus:ring-cyanGlow/20"
              />
            </label>
            <Button type="button" disabled={busy} onClick={() => void submitAction()}>
              {t("admin.confirm")}
            </Button>
          </div>
        </Modal>
      ) : null}

      {supportAction ? (
        <Modal title={t("admin.reply")} closeLabel={t("common.close")} onClose={() => setSupportAction(null)}>
          <div className="grid gap-4">
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <div className="font-black text-white">{supportAction.ticket.subject}</div>
              <div className="mt-2 whitespace-pre-wrap leading-6">{supportAction.ticket.message}</div>
            </div>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{t("admin.message")}</span>
              <textarea
                value={supportResponse}
                onChange={(event) => setSupportResponse(event.target.value)}
                rows={6}
                className="rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-cyanGlow focus:ring-2 focus:ring-cyanGlow/20"
              />
            </label>
            {(supportAction.ticket.category === "APPEAL" || supportAction.ticket.category === "BAN_APPEAL") ? (
              <label className="grid gap-2 text-sm text-slate-300">{t("adminExtra.appealDecision")}<select value={supportAppealStatus} onChange={(event) => setSupportAppealStatus(event.target.value)} className="min-h-11 rounded-md border border-slate-700 bg-ink px-3 text-white"><option value="UNDER_REVIEW">{t("adminExtra.appealStatuses.UNDER_REVIEW")}</option><option value="UPHELD">{t("adminExtra.appealStatuses.UPHELD")}</option><option value="REMOVED">{t("adminExtra.appealStatuses.REMOVED")}</option><option value="RESTORED">{t("adminExtra.appealStatuses.RESTORED")}</option><option value="REJECTED">{t("adminExtra.appealStatuses.REJECTED")}</option></select></label>
            ) : null}
            <label className="grid gap-2 text-sm text-slate-300">{t("adminExtra.internalNote")}<textarea value={supportInternalNote} onChange={(event) => setSupportInternalNote(event.target.value)} rows={3} className="rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50" /></label>
            <Button type="button" disabled={busy} onClick={() => void submitSupportAction()}>
              {supportAction.status === "CLOSED" ? t("admin.closeTicket") : t("admin.reply")}
            </Button>
          </div>
        </Modal>
      ) : null}

      {emailVerificationUser ? (
        <Modal title={t("admin.verifyEmailManually")} closeLabel={t("common.close")} onClose={() => setEmailVerificationUser(null)}>
          <div className="grid gap-4">
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <div className="font-black text-white">{emailVerificationUser.displayName}</div>
              <div className="mt-1 text-sm text-slate-300">{emailVerificationUser.email}</div>
            </div>
            <p className="text-sm leading-6 text-slate-300">{t("admin.manualVerifyWarning")}</p>
            <Button type="button" disabled={busy} onClick={() => void verifyEmailManually(emailVerificationUser)} icon={<MailCheck size={18} />}>
              {t("admin.confirm")}
            </Button>
          </div>
        </Modal>
      ) : null}

      {temporaryPassword ? (
        <Modal title={t("adminExtra.temporaryPassword")} closeLabel={t("adminExtra.closePermanently")} onClose={() => setTemporaryPassword(null)}>
          <div className="grid gap-4">
            <div className="rounded-md border border-goldGlow/30 bg-goldGlow/10 p-3 text-sm leading-6 text-slate-200">
              {t("adminExtra.temporaryPasswordHelp")}
            </div>
            <div className="rounded-md border border-white/10 bg-ink p-4 font-mono text-lg font-black text-white">{temporaryPassword.value}</div>
            <Button type="button" onClick={() => void navigator.clipboard.writeText(temporaryPassword.value)} icon={<Copy size={18} />}>{t("adminExtra.copyTemporaryPassword")}</Button>
            <Button type="button" variant="danger" onClick={() => setTemporaryPassword(null)}>{t("adminExtra.closeAndHide")}</Button>
          </div>
        </Modal>
      ) : null}

      {scoreAction ? (
        <Modal title={t("adminExtra.scoreDecisionTitle", { status: t(`adminExtra.scoreStatuses.${scoreAction.status}`) })} closeLabel={t("common.close")} onClose={() => setScoreAction(null)}>
          <div className="grid gap-4">
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">{scoreAction.score.displayName} | {scoreAction.score.score}</div>
            <label className="grid gap-2 text-sm text-slate-300">{t("admin.reason")}<textarea value={scoreReason} onChange={(event) => setScoreReason(event.target.value)} rows={5} className="rounded-md border border-slate-700 bg-ink p-3 text-white" /></label>
            <Button type="button" disabled={busy || scoreReason.trim().length < 3} onClick={() => void submitScoreAction()}>{t("adminExtra.confirmScoreDecision")}</Button>
          </div>
        </Modal>
      ) : null}

      {restrictionUser ? (
        <Modal title={t("adminExtra.addRestriction")} closeLabel={t("common.close")} onClose={() => setRestrictionUser(null)}>
          <div className="grid gap-4">
            <div className="font-black text-white">{restrictionUser.displayName}</div>
            <label className="grid gap-2 text-sm text-slate-300">{t("adminExtra.restrictionType")}<select value={restrictionType} onChange={(event) => setRestrictionType(event.target.value as RestrictionType)} className="min-h-11 rounded-md border border-slate-700 bg-ink px-3 text-white"><option value="warning">{t("restrictions.types.warning")}</option><option value="temporary_restriction">{t("restrictions.types.temporary_restriction")}</option><option value="support_restriction">{t("restrictions.types.support_restriction")}</option><option value="shop_restriction">{t("restrictions.types.shop_restriction")}</option><option value="leaderboard_restriction">{t("restrictions.types.leaderboard_restriction")}</option><option value="score_hidden">{t("restrictions.types.score_hidden")}</option><option value="rewards_removed">{t("restrictions.types.rewards_removed")}</option><option value="temporary_ban">{t("restrictions.types.temporary_ban")}</option><option value="permanent_ban">{t("restrictions.types.permanent_ban")}</option></select></label>
            <label className="grid gap-2 text-sm text-slate-300">{t("admin.reason")}<textarea value={restrictionReason} onChange={(event) => setRestrictionReason(event.target.value)} rows={5} className="rounded-md border border-slate-700 bg-ink p-3 text-white" /></label>
            <Button type="button" disabled={busy || restrictionReason.trim().length < 3} onClick={() => void submitRestriction()}>{t("adminExtra.applyRestriction")}</Button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
