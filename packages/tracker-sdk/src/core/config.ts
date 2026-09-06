export interface TrackerConfig {
  key: string;
  endpoint?: string;
  debug?: boolean;
  trackClicks?: boolean;
}

export function parseScriptConfig(script: HTMLScriptElement): TrackerConfig {
  const data = script.dataset;
  return {
    key: data.key ?? '',
    endpoint: data.endpoint || undefined,
    debug: data.debug === 'true' || data.debug === '1' ? true : undefined,
    trackClicks: data.trackClicks === 'false' || data.trackClicks === '0' ? false : undefined,
  };
}

export function findScript(): HTMLScriptElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const current = document.currentScript;
  if (current !== null && current instanceof HTMLScriptElement) {
    return current;
  }
  return document.querySelector<HTMLScriptElement>('script[data-key]');
}

export function readScriptConfig(): TrackerConfig | null {
  const script = findScript();
  if (script === null) {
    return null;
  }
  const config = parseScriptConfig(script);
  return config.key.length > 0 ? config : null;
}