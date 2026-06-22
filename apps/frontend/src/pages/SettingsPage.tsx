import { FormEvent, useMemo, useState } from "react";
import { BookOpen, Cookie, KeyRound, LifeBuoy, Lock, LogOut, RotateCcw, Save, Settings, ShieldCheck, Trash2, Volume2 } from "lucide-react";
import type { SupportedLocale } from "@waves/shared";
import { AccountRequiredModal } from "../components/auth/AccountRequiredModal";
import { LanguageSelector } from "../components/settings/LanguageSelector";
import { RangeSetting, SettingSection, ToggleSetting } from "../components/settings/SettingControls";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { authApi } from "../services/authApi";
import { useAuthStore } from "../store/authStore";
import { useGuestStore } from "../store/guestStore";
import { useUiStore } from "../store/uiStore";
import { defaultGameSettings, type GameSettings } from "../types/settings";
import { useConsentStore } from "../store/consentStore";
import { useTranslation } from "react-i18next";
import { playAudioPreview } from "../game/audio/GameAudioManager";

function mergeSettings(value: Record<string, unknown> | undefined): GameSettings {
  return { ...defaultGameSettings, ...(value ?? {}) } as GameSettings;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, patchProfile, replaceUser, logout } = useAuthStore();
  const { active: guestActive, session, updateSession, requestAuthentication } = useGuestStore();
  const setView = useUiStore((state) => state.setView);
  const isGuest = guestActive && !user;
  const initialSettings = useMemo(() => {
    if (isGuest && session) {
      return mergeSettings({
        movementType: session.selectedBasicControls.movementType,
        controlSensitivity: session.selectedBasicControls.sensitivity,
        joystickEnabled: session.selectedBasicControls.joystickEnabled,
        masterVolume: session.temporarySettings.masterVolume,
        muteAll: session.temporarySettings.muted,
        vibration: session.temporarySettings.vibration,
        reduceMotion: session.temporarySettings.reduceMotion,
        showTutorial: session.temporarySettings.showTutorial
      });
    }
    return mergeSettings(user?.profile.gameSettings);
  }, [isGuest, session?.guestId, user?.id]);
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const [displayName, setDisplayName] = useState(user?.profile.displayName ?? "Guest");
  const [locale, setLocale] = useState<SupportedLocale>((user?.profile.locale ?? session?.temporarySettings.locale ?? "en") as SupportedLocale);
  const [showUsername, setShowUsername] = useState(user?.profile.showUsernameInLeaderboard ?? true);
  const [hideProfile, setHideProfile] = useState(user?.profile.hideProfile ?? false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accountRequired, setAccountRequired] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const openConsentPreferences = useConsentStore((state) => state.openPreferences);

  function patchSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSaved("");
    setError("");
    try {
      if (isGuest) {
        updateSession((current) => ({
          ...current,
          selectedBasicControls: { movementType: settings.movementType, sensitivity: settings.controlSensitivity, joystickEnabled: settings.joystickEnabled },
          temporarySettings: { ...current.temporarySettings, locale, masterVolume: settings.masterVolume, muted: settings.muteAll, vibration: settings.vibration, reduceMotion: settings.reduceMotion, showTutorial: settings.showTutorial }
        }));
        localStorage.setItem("waves_locale", locale);
      } else if (user) {
        const profile = await authApi.updateProfile({ displayName: displayName.trim(), locale, gameSettings: { ...settings }, showUsernameInLeaderboard: showUsername, hideProfile });
        patchProfile(profile);
      }
      setSaved(t("settingsDetails.saved"));
    } catch (error) {
      setError(error instanceof Error ? error.message : t("settingsDetails.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await authApi.changePassword({ currentPassword: user?.mustChangePassword ? undefined : currentPassword, newPassword, confirmPassword });
      replaceUser(await authApi.me());
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(t("settingsDetails.passwordChanged"));
    } catch (error) {
      setError(error instanceof Error ? error.message : t("settingsDetails.passwordError"));
    } finally {
      setBusy(false);
    }
  }

  async function submitDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteConfirmation !== "DELETE") return;
    setBusy(true);
    setError("");
    try {
      await authApi.deleteAccount({ password: deletePassword, confirmation: "DELETE" });
      setDeletePassword("");
      await logout();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("settingsDetails.deleteError"));
      setDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-6">
      <header>
        <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink"><Settings size={17} /> {t("settings.title")}</div>
        <h1 className="text-4xl font-black text-white neon-text">{isGuest ? t("settings.guestTitle") : t("settings.accountTitle")}</h1>
        <p className="mt-2 text-slate-300">{isGuest ? t("settings.guestIntro") : t("settings.accountIntro")}</p>
      </header>

      {user?.mustChangePassword ? <div className="rounded-md border border-goldGlow/40 bg-goldGlow/10 p-4 text-sm font-bold text-goldGlow">{t("settingsDetails.temporaryPasswordWarning")}</div> : null}
      {saved ? <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm text-cyanGlow">{saved}</div> : null}
      {error ? <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}

      <form className="grid gap-5 xl:grid-cols-2" onSubmit={(event) => void saveSettings(event)}>
        {!isGuest && user ? (
          <SettingSection title={t("settings.account")}>
            <Input label={t("settingsDetails.username")} value={displayName} minLength={3} maxLength={24} onChange={(event) => setDisplayName(event.target.value)} />
            <div className="grid gap-2 text-sm text-slate-300"><span>{t("settingsDetails.email")}: <strong className="text-white">{user.email}</strong></span><span>{t("settingsDetails.status")}: <strong className="text-white">{t(`settingsDetails.accountStatuses.${user.status}`, user.status)}</strong></span><span>{t("settingsDetails.created")}: <strong className="text-white">{new Date(user.profile.createdAt).toLocaleDateString()}</strong></span></div>
            <Button type="button" variant="danger" onClick={() => void logout()} icon={<LogOut size={18} />}>{t("auth.logout")}</Button>
          </SettingSection>
        ) : (
          <SettingSection title={t("settings.account")} locked>
            <p className="text-sm leading-6 text-slate-400">{t("settingsDetails.guestAccountLimit")}</p>
            <Button type="button" onClick={() => setAccountRequired(true)} icon={<Lock size={18} />}>{t("settingsDetails.unlockAccountSettings")}</Button>
          </SettingSection>
        )}

        <SettingSection title={t("settings.gameplay")}>
          {!isGuest ? <label className="grid gap-2 text-sm text-slate-200">{t("settingsDetails.difficulty")}<select value={settings.difficulty} onChange={(event) => patchSetting("difficulty", event.target.value as GameSettings["difficulty"])} className="min-h-11 rounded-md border border-slate-700 bg-ink px-3"><option value="adaptive">{t("settingsDetails.options.adaptive")}</option><option value="normal">{t("settingsDetails.options.normal")}</option><option value="hard">{t("settingsDetails.options.hard")}</option></select></label> : null}
          <RangeSetting label={t("settingsDetails.controlSensitivity")} value={settings.controlSensitivity} min={0.5} max={1.5} step={0.05} onChange={(value) => patchSetting("controlSensitivity", value)} />
          <label className="grid gap-2 text-sm text-slate-200">{t("settingsDetails.movementType")}<select value={settings.movementType} onChange={(event) => patchSetting("movementType", event.target.value as GameSettings["movementType"])} className="min-h-11 rounded-md border border-slate-700 bg-ink px-3"><option value="click">{t("settingsDetails.options.click")}</option><option value="keyboard">{t("settingsDetails.options.keyboard")}</option><option value="touch">{t("settingsDetails.options.touch")}</option></select></label>
          <ToggleSetting label={t("settingsDetails.vibration")} checked={settings.vibration} onChange={(value) => patchSetting("vibration", value)} />
          {!isGuest ? <><ToggleSetting label={t("settingsDetails.autoPause")} checked={settings.autoPause} onChange={(value) => patchSetting("autoPause", value)} /><ToggleSetting label={t("settingsDetails.showScore")} checked={settings.showScoreDuringGame} onChange={(value) => patchSetting("showScoreDuringGame", value)} /></> : null}
          <ToggleSetting label={t("settingsDetails.showTutorial")} checked={settings.showTutorial} onChange={(value) => patchSetting("showTutorial", value)} />
          <ToggleSetting label={t("settingsDetails.reduceMotion")} checked={settings.reduceMotion} onChange={(value) => patchSetting("reduceMotion", value)} />
        </SettingSection>

        <SettingSection title={t("settings.controls")}>
          <ToggleSetting label={t("settingsDetails.keyboardControls")} checked={settings.keyboardControls} onChange={(value) => patchSetting("keyboardControls", value)} />
          <ToggleSetting label={t("settingsDetails.touchControls")} checked={settings.touchControls} onChange={(value) => patchSetting("touchControls", value)} />
          <ToggleSetting label={t("settingsDetails.mouseControls")} checked={settings.mouseControls} onChange={(value) => patchSetting("mouseControls", value)} />
          <ToggleSetting label={t("settingsDetails.virtualJoystick")} checked={settings.joystickEnabled} onChange={(value) => patchSetting("joystickEnabled", value)} />
          <RangeSetting label={t("settingsDetails.controlSize")} value={settings.controlSize} min={0.7} max={1.4} step={0.05} onChange={(value) => patchSetting("controlSize", value)} />
          <Button type="button" variant="ghost" onClick={() => setSettings((current) => ({ ...current, keyboardControls: true, touchControls: true, mouseControls: true, joystickEnabled: true, controlSize: 1, controlSensitivity: 1 }))} icon={<RotateCcw size={18} />}>{t("settingsDetails.resetControls")}</Button>
        </SettingSection>

        <SettingSection title={t("settings.audio")}>
          <RangeSetting label={t("settingsDetails.masterVolume")} value={settings.masterVolume} onChange={(value) => patchSetting("masterVolume", value)} />
          <RangeSetting label={t("settingsDetails.musicVolume")} value={settings.musicVolume} onChange={(value) => patchSetting("musicVolume", value)} />
          <RangeSetting label={t("settingsDetails.effectsVolume")} value={settings.soundEffectsVolume} onChange={(value) => patchSetting("soundEffectsVolume", value)} />
          <ToggleSetting label={t("settingsDetails.muteAll")} checked={settings.muteAll} onChange={(value) => patchSetting("muteAll", value)} />
          <Button type="button" variant="ghost" disabled={settings.muteAll || settings.masterVolume === 0} onClick={() => void playAudioPreview(settings)} icon={<Volume2 size={18} />}>{t("settingsDetails.testAudio")}</Button>
        </SettingSection>

        <SettingSection title={t("settings.visuals")}>
          <ToggleSetting label={t("settingsDetails.particles")} checked={settings.particles} onChange={(value) => patchSetting("particles", value)} />
          <ToggleSetting label={t("settingsDetails.screenShake")} checked={settings.screenShake} onChange={(value) => patchSetting("screenShake", value)} />
          <ToggleSetting label={t("settingsDetails.trailEffects")} checked={settings.trailEffects} onChange={(value) => patchSetting("trailEffects", value)} />
          {!isGuest ? <label className="grid gap-2 text-sm text-slate-200">{t("settingsDetails.animationQuality")}<select value={settings.animationQuality} onChange={(event) => patchSetting("animationQuality", event.target.value as GameSettings["animationQuality"])} className="min-h-11 rounded-md border border-slate-700 bg-ink px-3"><option value="low">{t("settingsDetails.options.low")}</option><option value="medium">{t("settingsDetails.options.medium")}</option><option value="high">{t("settingsDetails.options.high")}</option></select></label> : null}
          <ToggleSetting label={t("settingsDetails.lowPerformance")} checked={settings.lowPerformanceMode} onChange={(value) => patchSetting("lowPerformanceMode", value)} />
          <ToggleSetting label={t("settingsDetails.highContrast")} checked={settings.highContrastMode} onChange={(value) => patchSetting("highContrastMode", value)} />
        </SettingSection>

        <SettingSection title={t("settings.language")}><LanguageSelector value={locale} onChange={setLocale} /></SettingSection>

        {!isGuest ? (
          <>
            <SettingSection title={t("settings.privacy")}><ToggleSetting label={t("settingsDetails.showLeaderboardName")} checked={showUsername} onChange={setShowUsername} /><ToggleSetting label={t("settingsDetails.hideProfile")} checked={hideProfile} onChange={setHideProfile} /><Button type="button" variant="ghost" onClick={openConsentPreferences} icon={<Cookie size={18} />}>{t("consent.preferences")}</Button></SettingSection>
            <SettingSection title={t("settings.ads")}><ToggleSetting label={t("settingsDetails.allowRewardedAds")} checked={settings.rewardedAdsPermission} onChange={(value) => patchSetting("rewardedAdsPermission", value)} /><p className="text-xs leading-5 text-slate-400">{t("settingsDetails.rewardedAdsHelp")}</p></SettingSection>
          </>
        ) : null}

        <SettingSection title={t("settings.support")}>
          <div className="rounded-md border border-goldGlow/30 bg-goldGlow/10 p-3 text-sm text-slate-200">{t("support.passwordWarning")}</div>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setView("support")} icon={<LifeBuoy size={18} />}>{t("settingsDetails.openSupport")}</Button><Button type="button" variant="ghost" onClick={() => setView("rules")} icon={<BookOpen size={18} />}>{t("settingsDetails.supportRules")}</Button></div>
        </SettingSection>

        <div className="xl:col-span-2"><Button type="submit" disabled={busy} icon={<Save size={18} />}>{t("settings.save")}</Button></div>
      </form>

      {!isGuest && user ? (
        <form className="arcade-border grid max-w-2xl gap-4 rounded-lg p-5" onSubmit={(event) => void submitPassword(event)}>
          <div className="flex items-center gap-2 text-cyanGlow"><ShieldCheck size={20} /><h2 className="text-xl font-black text-white">{t("settingsDetails.securityPassword")}</h2></div>
          <p className="text-sm text-slate-400">{t("settingsDetails.lastPasswordChange", { date: new Date(user.lastPasswordChangeAt).toLocaleString() })}</p>
          {!user.mustChangePassword ? <Input label={t("settingsDetails.currentPassword")} type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /> : null}
          <Input label={t("settingsDetails.newPassword")} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} required />
          <Input label={t("settingsDetails.confirmPassword")} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={10} required />
          <p className="text-xs leading-5 text-slate-500">{t("settingsDetails.passwordHelp")}</p>
          <Button type="submit" disabled={busy || newPassword !== confirmPassword} icon={<KeyRound size={18} />}>{t("settingsDetails.changePassword")}</Button>
        </form>
      ) : null}

      {!isGuest && user?.role !== "ADMIN" ? <section className="rounded-lg border border-magentaGlow/30 bg-magentaGlow/10 p-5"><h2 className="text-xl font-black text-white">{t("settingsDetails.deleteAccount")}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("settingsDetails.deleteAccountHelp")}</p><Button type="button" className="mt-4" variant="danger" onClick={() => setDeleteOpen(true)} icon={<Trash2 size={18} />}>{t("settingsDetails.deleteMyAccount")}</Button></section> : null}

      {accountRequired ? <AccountRequiredModal onLogin={() => requestAuthentication("login")} onRegister={() => requestAuthentication("register")} onContinue={() => setAccountRequired(false)} /> : null}
      {deleteOpen ? <Modal title={t("settingsDetails.deletePermanently")} closeLabel={t("common.cancel")} onClose={() => setDeleteOpen(false)}><form className="grid gap-4" onSubmit={(event) => void submitDeleteAccount(event)}><p className="text-sm leading-6 text-slate-300">{t("settingsDetails.deleteConfirmationHelp")}</p><Input label={t("settingsDetails.currentPassword")} type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} required /><Input label={t("settingsDetails.typeDelete")} value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} required /><Button type="submit" variant="danger" disabled={busy || deleteConfirmation !== "DELETE"}>{t("settingsDetails.deleteForever")}</Button></form></Modal> : null}
    </section>
  );
}
