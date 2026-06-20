import { FormEvent, useMemo, useState } from "react";
import { BookOpen, KeyRound, LifeBuoy, Lock, LogOut, RotateCcw, Save, Settings, ShieldCheck } from "lucide-react";
import type { SupportedLocale } from "@waves/shared";
import { AccountRequiredModal } from "../components/auth/AccountRequiredModal";
import { LanguageSelector } from "../components/settings/LanguageSelector";
import { RangeSetting, SettingSection, ToggleSetting } from "../components/settings/SettingControls";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { authApi } from "../services/authApi";
import { useAuthStore } from "../store/authStore";
import { useGuestStore } from "../store/guestStore";
import { useUiStore } from "../store/uiStore";
import { defaultGameSettings, type GameSettings } from "../types/settings";

function mergeSettings(value: Record<string, unknown> | undefined): GameSettings {
  return { ...defaultGameSettings, ...(value ?? {}) } as GameSettings;
}

export function SettingsPage() {
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
      setSaved("Settings saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Settings could not be saved.");
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
      setSaved("Password changed successfully.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Password could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-6">
      <header>
        <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink"><Settings size={17} /> Settings</div>
        <h1 className="text-4xl font-black text-white neon-text">{isGuest ? "Limited guest settings" : "Account and game settings"}</h1>
        <p className="mt-2 text-slate-300">{isGuest ? "These preferences stay on this device." : "Your supported preferences are saved to your account."}</p>
      </header>

      {user?.mustChangePassword ? <div className="rounded-md border border-goldGlow/40 bg-goldGlow/10 p-4 text-sm font-bold text-goldGlow">Your temporary password was accepted. You must choose a new password before using other account features.</div> : null}
      {saved ? <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm text-cyanGlow">{saved}</div> : null}
      {error ? <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}

      <form className="grid gap-5 xl:grid-cols-2" onSubmit={(event) => void saveSettings(event)}>
        {!isGuest && user ? (
          <SettingSection title="Account">
            <Input label="Username" value={displayName} minLength={3} maxLength={24} onChange={(event) => setDisplayName(event.target.value)} />
            <div className="grid gap-2 text-sm text-slate-300"><span>Email: <strong className="text-white">{user.email}</strong></span><span>Status: <strong className="text-white">{user.status}</strong></span><span>Created: <strong className="text-white">{new Date(user.profile.createdAt).toLocaleDateString()}</strong></span></div>
            <Button type="button" variant="danger" onClick={() => void logout()} icon={<LogOut size={18} />}>Logout</Button>
          </SettingSection>
        ) : (
          <SettingSection title="Account" locked>
            <p className="text-sm leading-6 text-slate-400">Guest has no cloud profile, leaderboard identity, purchases, achievements, or cross-device progress.</p>
            <Button type="button" onClick={() => setAccountRequired(true)} icon={<Lock size={18} />}>Unlock account settings</Button>
          </SettingSection>
        )}

        <SettingSection title="Gameplay">
          {!isGuest ? <label className="grid gap-2 text-sm text-slate-200">Difficulty<select value={settings.difficulty} onChange={(event) => patchSetting("difficulty", event.target.value as GameSettings["difficulty"])} className="min-h-11 rounded-md border border-slate-700 bg-ink px-3"><option value="adaptive">Adaptive</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label> : null}
          <RangeSetting label="Control sensitivity" value={settings.controlSensitivity} min={0.5} max={1.5} step={0.05} onChange={(value) => patchSetting("controlSensitivity", value)} />
          <label className="grid gap-2 text-sm text-slate-200">Movement type<select value={settings.movementType} onChange={(event) => patchSetting("movementType", event.target.value as GameSettings["movementType"])} className="min-h-11 rounded-md border border-slate-700 bg-ink px-3"><option value="click">Mouse / click</option><option value="keyboard">Keyboard</option><option value="touch">Touch</option></select></label>
          <ToggleSetting label="Vibration" checked={settings.vibration} onChange={(value) => patchSetting("vibration", value)} />
          {!isGuest ? <><ToggleSetting label="Auto pause" checked={settings.autoPause} onChange={(value) => patchSetting("autoPause", value)} /><ToggleSetting label="Show score during game" checked={settings.showScoreDuringGame} onChange={(value) => patchSetting("showScoreDuringGame", value)} /></> : null}
          <ToggleSetting label="Show tutorial" checked={settings.showTutorial} onChange={(value) => patchSetting("showTutorial", value)} />
          <ToggleSetting label="Reduce motion" checked={settings.reduceMotion} onChange={(value) => patchSetting("reduceMotion", value)} />
        </SettingSection>

        <SettingSection title="Controls">
          <ToggleSetting label="Keyboard controls" checked={settings.keyboardControls} onChange={(value) => patchSetting("keyboardControls", value)} />
          <ToggleSetting label="Touch controls" checked={settings.touchControls} onChange={(value) => patchSetting("touchControls", value)} />
          <ToggleSetting label="Mouse controls" checked={settings.mouseControls} onChange={(value) => patchSetting("mouseControls", value)} />
          <ToggleSetting label="Virtual joystick" checked={settings.joystickEnabled} onChange={(value) => patchSetting("joystickEnabled", value)} />
          <RangeSetting label="Control size" value={settings.controlSize} min={0.7} max={1.4} step={0.05} onChange={(value) => patchSetting("controlSize", value)} />
          <Button type="button" variant="ghost" onClick={() => setSettings((current) => ({ ...current, keyboardControls: true, touchControls: true, mouseControls: true, joystickEnabled: true, controlSize: 1, controlSensitivity: 1 }))} icon={<RotateCcw size={18} />}>Reset controls</Button>
        </SettingSection>

        <SettingSection title="Audio">
          <RangeSetting label="Master volume" value={settings.masterVolume} onChange={(value) => patchSetting("masterVolume", value)} />
          <RangeSetting label="Music volume" value={settings.musicVolume} onChange={(value) => patchSetting("musicVolume", value)} />
          <RangeSetting label="Sound effects volume" value={settings.soundEffectsVolume} onChange={(value) => patchSetting("soundEffectsVolume", value)} />
          <ToggleSetting label="Mute all" checked={settings.muteAll} onChange={(value) => patchSetting("muteAll", value)} />
        </SettingSection>

        <SettingSection title="Visuals">
          <ToggleSetting label="Particles" checked={settings.particles} onChange={(value) => patchSetting("particles", value)} />
          <ToggleSetting label="Screen shake" checked={settings.screenShake} onChange={(value) => patchSetting("screenShake", value)} />
          <ToggleSetting label="Trail effects" checked={settings.trailEffects} onChange={(value) => patchSetting("trailEffects", value)} />
          {!isGuest ? <label className="grid gap-2 text-sm text-slate-200">Animation quality<select value={settings.animationQuality} onChange={(event) => patchSetting("animationQuality", event.target.value as GameSettings["animationQuality"])} className="min-h-11 rounded-md border border-slate-700 bg-ink px-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label> : null}
          <ToggleSetting label="Low performance mode" checked={settings.lowPerformanceMode} onChange={(value) => patchSetting("lowPerformanceMode", value)} />
          <ToggleSetting label="High contrast mode" checked={settings.highContrastMode} onChange={(value) => patchSetting("highContrastMode", value)} />
        </SettingSection>

        <SettingSection title="Language"><LanguageSelector value={locale} onChange={setLocale} /></SettingSection>

        {!isGuest ? (
          <>
            <SettingSection title="Privacy"><ToggleSetting label="Show username in leaderboard" checked={showUsername} onChange={setShowUsername} /><ToggleSetting label="Hide profile" checked={hideProfile} onChange={setHideProfile} /></SettingSection>
            <SettingSection title="Ads"><ToggleSetting label="Allow rewarded ads" checked={settings.rewardedAdsPermission} onChange={(value) => patchSetting("rewardedAdsPermission", value)} /><p className="text-xs leading-5 text-slate-400">Rewarded ads are optional. Guests may see more ads because account features and purchase history are unavailable.</p></SettingSection>
          </>
        ) : null}

        <SettingSection title="Support">
          <div className="rounded-md border border-goldGlow/30 bg-goldGlow/10 p-3 text-sm text-slate-200">Never send your password. Support will never ask for your password.</div>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setView("support")} icon={<LifeBuoy size={18} />}>Open support ticket</Button><Button type="button" variant="ghost" onClick={() => setView("rules")} icon={<BookOpen size={18} />}>Support rules</Button></div>
        </SettingSection>

        <div className="xl:col-span-2"><Button type="submit" disabled={busy} icon={<Save size={18} />}>Save settings</Button></div>
      </form>

      {!isGuest && user ? (
        <form className="arcade-border grid max-w-2xl gap-4 rounded-lg p-5" onSubmit={(event) => void submitPassword(event)}>
          <div className="flex items-center gap-2 text-cyanGlow"><ShieldCheck size={20} /><h2 className="text-xl font-black text-white">Security / Password</h2></div>
          <p className="text-sm text-slate-400">Last password change: {new Date(user.lastPasswordChangeAt).toLocaleString()}. Never share your password.</p>
          {!user.mustChangePassword ? <Input label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /> : null}
          <Input label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} required />
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={10} required />
          <p className="text-xs leading-5 text-slate-500">Use at least 10 characters with uppercase, lowercase, and a number. Do not reuse your current password.</p>
          <Button type="submit" disabled={busy || newPassword !== confirmPassword} icon={<KeyRound size={18} />}>Change password</Button>
        </form>
      ) : null}

      {accountRequired ? <AccountRequiredModal onLogin={() => requestAuthentication("login")} onRegister={() => requestAuthentication("register")} onContinue={() => setAccountRequired(false)} /> : null}
    </section>
  );
}
