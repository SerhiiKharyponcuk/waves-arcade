export interface GameAudioSettings {
  masterVolume: number;
  musicVolume: number;
  soundEffectsVolume: number;
  muteAll: boolean;
}

type AudioContextConstructor = typeof AudioContext;

const clampVolume = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export class GameAudioManager {
  private context?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private effects?: GainNode;
  private musicTimer?: number;
  private musicStep = 0;
  private unlocked = false;

  constructor(private readonly settings: GameAudioSettings) {}

  async unlock() {
    if (this.settings.muteAll) return;
    this.ensureGraph();
    if (!this.context) return;
    if (this.context.state === "suspended") {
      try {
        await this.context.resume();
      } catch {
        return;
      }
    }
    if (!this.unlocked) {
      this.unlocked = true;
      this.playStart();
      this.startMusic();
    }
  }

  playControl() {
    this.playTone(245, 0.035, "sine", 0.055, 330);
  }

  playCoin() {
    this.playTone(740, 0.07, "sine", 0.16, 980);
    window.setTimeout(() => this.playTone(1_050, 0.08, "triangle", 0.11, 1_280), 55);
  }

  playCrash() {
    this.stopMusic();
    this.playTone(150, 0.34, "sawtooth", 0.24, 48);
    window.setTimeout(() => this.playTone(72, 0.3, "square", 0.1, 38), 45);
  }

  setPaused(paused: boolean) {
    if (!this.unlocked) return;
    if (paused) {
      this.stopMusic();
    } else {
      void this.context?.resume();
      this.startMusic();
    }
  }

  destroy() {
    this.stopMusic();
    this.unlocked = false;
    if (this.context && this.context.state !== "closed") void this.context.close();
    this.context = undefined;
  }

  private ensureGraph() {
    if (this.context || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.music = this.context.createGain();
    this.effects = this.context.createGain();
    this.master.gain.value = this.settings.muteAll ? 0 : clampVolume(this.settings.masterVolume);
    this.music.gain.value = clampVolume(this.settings.musicVolume) * 0.42;
    this.effects.gain.value = clampVolume(this.settings.soundEffectsVolume);
    this.music.connect(this.master);
    this.effects.connect(this.master);
    this.master.connect(this.context.destination);
  }

  private playStart() {
    this.playTone(220, 0.09, "triangle", 0.1, 440);
    window.setTimeout(() => this.playTone(440, 0.12, "triangle", 0.12, 660), 80);
  }

  private startMusic() {
    if (this.musicTimer || !this.unlocked || this.settings.muteAll) return;
    const sequence = [110, 164.81, 220, 146.83, 196, 246.94, 164.81, 220];
    const playStep = () => {
      const frequency = sequence[this.musicStep % sequence.length] ?? 110;
      this.musicStep += 1;
      this.playTone(frequency, 0.42, "triangle", 0.065, frequency * 1.01, true);
    };
    playStep();
    this.musicTimer = window.setInterval(playStep, 520);
  }

  private stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }

  private playTone(frequency: number, duration: number, wave: OscillatorType, volume: number, endFrequency = frequency, music = false) {
    if (!this.unlocked || this.settings.muteAll) return;
    this.ensureGraph();
    if (!this.context || !this.effects || !this.music || this.context.state !== "running") return;

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(music ? this.music : this.effects);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}

export async function playAudioPreview(settings: GameAudioSettings) {
  const preview = new GameAudioManager(settings);
  await preview.unlock();
  preview.playCoin();
  window.setTimeout(() => preview.destroy(), 900);
}
