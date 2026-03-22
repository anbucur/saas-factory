import { Howl } from 'howler';

const SOUND_BASE = '/sounds';

export const SOUNDS = {
  phaseStart: { src: `${SOUND_BASE}/chime.mp3`, volume: 0.3 },
  phaseComplete: { src: `${SOUND_BASE}/success.mp3`, volume: 0.4 },
  agentActivated: { src: `${SOUND_BASE}/beep.mp3`, volume: 0.2 },
  taskComplete: { src: `${SOUND_BASE}/tick.mp3`, volume: 0.15 },
  error: { src: `${SOUND_BASE}/warning.mp3`, volume: 0.5 },
  projectComplete: { src: `${SOUND_BASE}/celebration.mp3`, volume: 0.6 },
  notification: { src: `${SOUND_BASE}/notification.mp3`, volume: 0.25 },
} as const;

export type SoundName = keyof typeof SOUNDS;

let soundInstances: Map<SoundName, Howl> = new Map();
let enabled = true;

export function initSounds() {
  Object.entries(SOUNDS).forEach(([name, config]) => {
    const sound = new Howl({
      src: [config.src],
      volume: config.volume,
      preload: true,
    });
    soundInstances.set(name as SoundName, sound);
  });
}

export function playSound(name: SoundName) {
  if (!enabled) return;
  const sound = soundInstances.get(name);
  if (sound) {
    sound.play();
  }
}

export function setSoundsEnabled(enabled_: boolean) {
  enabled = enabled_;
}

export function isSoundEnabled() {
  return enabled;
}
