import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type AdminSection = "overview" | "users" | "scores" | "support" | "activity";

export interface AdminNavigationItem {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
  count?: number;
  urgent?: boolean;
}

interface AdminNavigationProps {
  active: AdminSection;
  items: AdminNavigationItem[];
  onChange: (section: AdminSection) => void;
}

export function AdminNavigation({ active, items, onChange }: AdminNavigationProps) {
  return (
    <nav className="sticky top-2 z-20 -mx-2 overflow-x-auto px-2 pb-2" aria-label="Admin workspace">
      <div className="flex min-w-max gap-2 rounded-lg border border-white/10 bg-ink/95 p-2 shadow-xl backdrop-blur md:grid md:min-w-0 md:grid-cols-5">
        {items.map(({ id, label, icon: Icon, count, urgent }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={active === id ? "page" : undefined}
            className={`relative inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-4 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-cyanGlow/50 ${
              active === id
                ? "border-cyanGlow bg-cyanGlow text-ink shadow-neon"
                : "border-transparent bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
            {typeof count === "number" && count > 0 ? (
              <span
                className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] ${
                  active === id ? "bg-ink/20 text-ink" : urgent ? "bg-magentaGlow text-white" : "bg-white/10 text-slate-200"
                }`}
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  );
}

interface AdminMetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  detail?: string;
  tone?: "cyan" | "gold" | "danger" | "neutral";
  onClick?: () => void;
}

const toneClasses = {
  cyan: "border-cyanGlow/25 bg-cyanGlow/5 text-cyanGlow",
  gold: "border-goldGlow/25 bg-goldGlow/5 text-goldGlow",
  danger: "border-magentaGlow/30 bg-magentaGlow/10 text-pink-200",
  neutral: "border-white/10 bg-white/5 text-slate-300"
};

export function AdminMetricCard({ label, value, icon: Icon, detail, tone = "neutral", onClick }: AdminMetricCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-black uppercase text-slate-400">{label}</div>
        <Icon size={19} className={tone === "neutral" ? "text-slate-400" : undefined} aria-hidden="true" />
      </div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
      {detail ? <div className="mt-1 text-xs text-slate-400">{detail}</div> : null}
    </>
  );

  const className = `min-h-32 rounded-lg border p-4 text-left transition ${toneClasses[tone]} ${
    onClick ? "cursor-pointer hover:-translate-y-0.5 hover:border-current focus:outline-none focus:ring-2 focus:ring-cyanGlow/40" : ""
  }`;

  return onClick ? (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  ) : (
    <article className={className}>{content}</article>
  );
}

export function AdminSectionHeader({ title, description, icon: Icon, action }: { title: string; description?: string; icon: LucideIcon; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black text-white">
          <Icon size={21} className="text-cyanGlow" aria-hidden="true" />
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function AdminEmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
      <div>
        <Icon size={30} className="mx-auto text-slate-500" aria-hidden="true" />
        <div className="mt-3 font-black text-white">{title}</div>
        {description ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">{description}</p> : null}
      </div>
    </div>
  );
}
