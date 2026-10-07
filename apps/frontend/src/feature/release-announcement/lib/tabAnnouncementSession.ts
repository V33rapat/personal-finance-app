const TAB_ID_KEY = "walpaca.release-announcement.tab-id";
const SUPPRESSION_KEY_PREFIX = "walpaca.release-announcement.suppressed:";
const CHANNEL_PREFIX = "walpaca.release-announcement.tab:";
const PROBE_TIMEOUT_MS = 120;

export interface TabAnnouncementSession {
  getSuppressedIds(userId: string): string[];
  suppress(userId: string, releaseIds: string[]): void;
  dispose(): void;
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function clearSuppressedSessionState(): void {
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(SUPPRESSION_KEY_PREFIX)) {
      window.sessionStorage.removeItem(key);
    }
  }
}

function readIds(userId: string): string[] {
  try {
    const value = window.sessionStorage.getItem(`${SUPPRESSION_KEY_PREFIX}${userId}`);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export async function createTabAnnouncementSession(): Promise<TabAnnouncementSession> {
  let tabId: string | null = null;

  try {
    tabId = window.sessionStorage.getItem(TAB_ID_KEY);
  } catch {
    tabId = null;
  }

  if (tabId && typeof BroadcastChannel !== "undefined") {
    const probeId = createId();
    const probeChannel = new BroadcastChannel(`${CHANNEL_PREFIX}${tabId}`);
    const isDuplicate = await new Promise<boolean>((resolve) => {
      const timeoutId = window.setTimeout(() => resolve(false), PROBE_TIMEOUT_MS);
      probeChannel.onmessage = (event: MessageEvent<{ type?: string; probeId?: string }>) => {
        if (event.data?.type !== "probe-response" || event.data.probeId !== probeId) return;
        window.clearTimeout(timeoutId);
        resolve(true);
      };
      probeChannel.postMessage({ type: "probe", probeId });
    });
    probeChannel.close();

    if (isDuplicate) {
      tabId = null;
      clearSuppressedSessionState();
    }
  }

  if (!tabId) {
    tabId = createId();
    try {
      window.sessionStorage.setItem(TAB_ID_KEY, tabId);
    } catch {
      // The in-memory channel still scopes this page when storage is unavailable.
    }
  }

  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(`${CHANNEL_PREFIX}${tabId}`);
  if (channel) {
    channel.onmessage = (event: MessageEvent<{ type?: string; probeId?: string }>) => {
      if (event.data?.type === "probe" && event.data.probeId) {
        channel.postMessage({ type: "probe-response", probeId: event.data.probeId });
      }
    };
  }

  return {
    getSuppressedIds: readIds,
    suppress(userId, releaseIds) {
      const combined = new Set([...readIds(userId), ...releaseIds]);
      try {
        window.sessionStorage.setItem(
          `${SUPPRESSION_KEY_PREFIX}${userId}`,
          JSON.stringify([...combined]),
        );
      } catch {
        // A storage failure only affects this tab's temporary suppression.
      }
    },
    dispose() {
      channel?.close();
    },
  };
}
