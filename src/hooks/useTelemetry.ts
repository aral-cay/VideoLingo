export interface TelemetryEvent {
  name: string;
  payload: Record<string, any>;
  ts: number;
}

export interface TelemetryState {
  events: TelemetryEvent[];
  pageStarts: Record<string, number>;
  pageTimes: Record<string, number>;
}

const TELEMETRY_STORAGE_PREFIX = 'telemetry:';

export function useTelemetry(pageName: string) {
  const storageKey = `${TELEMETRY_STORAGE_PREFIX}${pageName}`;

  const loadEvents = (): TelemetryEvent[] => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.events || [];
      }
    } catch (e) {
      console.error('Failed to load telemetry:', e);
    }
    return [];
  };

  const saveEvents = (events: TelemetryEvent[]) => {
    try {
      const state: TelemetryState = {
        events,
        pageStarts: {},
        pageTimes: {},
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save telemetry:', e);
    }
  };

  const track = (eventName: string, payload: Record<string, any> = {}) => {
    const event: TelemetryEvent = {
      name: eventName,
      payload,
      ts: Date.now(),
    };

    const events = loadEvents();
    events.push(event);
    saveEvents(events);

    // Also log to console
    console.log(`[Telemetry:${pageName}]`, eventName, payload);
  };

  const markPageStart = () => {
    const startTime = Date.now();
    track('page_start', { startTime });
    return startTime;
  };

  const markPageEnd = () => {
    const events = loadEvents();
    const startEvent = events.findLast((e) => e.name === 'page_start');
    if (startEvent) {
      const timeOnPage = Date.now() - startEvent.ts;
      track('page_end', { timeOnPage });
      track('time_on_page', { timeOnPage });
    }
  };

  return {
    track,
    markPageStart,
    markPageEnd,
    loadEvents,
  };
}

