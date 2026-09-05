import { readScriptConfig } from './core/config.js';
import { init } from './core/tracker.js';
import type { Tracker } from './core/tracker.js';

export interface SpecialistGTMGlobal {
  SpecialistGTM?: Tracker;
  sgtm?: Tracker;
}

declare global {
  interface Window {
    SpecialistGTM?: Tracker;
    sgtm?: Tracker;
  }
}

export function autoInit(): Tracker | null {
  const config = readScriptConfig();
  if (config === null) {
    return null;
  }
  const tracker = init(config);
  installGlobal(tracker);
  return tracker;
}

export function installGlobal(tracker: Tracker): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.SpecialistGTM = tracker;
  window.sgtm = tracker;
}

if (typeof document !== 'undefined') {
  autoInit();
}