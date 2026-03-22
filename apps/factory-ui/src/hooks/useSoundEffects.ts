import { useCallback, useEffect, useState } from 'react';
import { playSound, initSounds, setSoundsEnabled, isSoundEnabled, SoundName } from '../lib/sounds';

export function useSoundEffects() {
  const [enabled, setEnabledState] = useState(() => isSoundEnabled());

  useEffect(() => {
    initSounds();
  }, []);

  const toggle = useCallback(() => {
    const newValue = !enabled;
    setSoundsEnabled(newValue);
    setEnabledState(newValue);
  }, [enabled]);

  const play = useCallback((name: SoundName) => {
    playSound(name);
  }, []);

  return { enabled, toggle, play };
}
