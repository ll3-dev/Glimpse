/**
 * LLM Stream Events (Mobile)
 *
 * Provides event push delivery for LLM streaming tokens and completion,
 * aligned with the desktop rustra event contracts (`llm:stream-token`, `llm:stream-done`).
 */

export const STREAM_TOKEN_EVENT = 'llm:stream-token';
export const STREAM_DONE_EVENT = 'llm:stream-done';

export interface StreamTokenPayload {
  requestId: string;
  token: string;
}

export interface StreamDonePayload {
  requestId: string;
  fullText: string;
  stopReason: string;
}

type EventListener<T = unknown> = (payload: T) => void;

type RustraEventNativeSurface = {
  onEvent?(name: string, callback: (payloadJson: string) => void): void;
  offEvent?(name: string): void;
};

/**
 * Native event push wiring — JSI `onEvent`/`offEvent` over the rustra FFI
 * event sink (CallInvoker-marshalled to the JS thread).
 *
 * When the JSI bridge exposes `onEvent`, the first subscriber of an event
 * name registers a native listener that parses the JSON payload once and
 * re-emits into this hub, so Rust-side emitters and local JS emitters
 * (llama.rn token callbacks) share one subscription surface. The last
 * unsubscribe releases the native listener (push → polling path revert on
 * the Rust side). Without the native surface (Expo Go, tests), the hub
 * stays local-only — behavior is unchanged.
 */
function registerNativeListener(
  eventName: string,
  emit: (payload: unknown) => void,
): (() => void) | null {
  let native: RustraEventNativeSurface | undefined;
  try {
    native = (globalThis as { __rustraNative?: RustraEventNativeSurface })
      .__rustraNative;
  } catch {
    native = undefined;
  }
  if (!native?.onEvent || !native?.offEvent) {
    return null;
  }

  try {
    native.onEvent(eventName, (payloadJson) => {
      let payload: unknown;
      try {
        payload = JSON.parse(payloadJson);
      } catch {
        payload = payloadJson;
      }
      emit(payload);
    });
  } catch {
    return null;
  }

  return () => {
    try {
      native?.offEvent?.(eventName);
    } catch {
      // Native surface vanished mid-flight (reload) — nothing to release.
    }
  };
}

class StreamEventHub {
  private listeners = new Map<string, Set<EventListener<any>>>();
  private nativeUnsubscribers = new Map<string, () => void>();

  subscribe<T>(eventName: string, listener: EventListener<T>): () => void {
    let set = this.listeners.get(eventName);
    if (!set) {
      set = new Set();
      this.listeners.set(eventName, set);
    }
    const isFirstForName = set.size === 0;
    set.add(listener as EventListener<any>);

    if (isFirstForName && !this.nativeUnsubscribers.has(eventName)) {
      const release = registerNativeListener(eventName, (payload) => {
        this.emit(eventName, payload);
      });
      if (release) {
        this.nativeUnsubscribers.set(eventName, release);
      }
    }

    return () => {
      const currentSet = this.listeners.get(eventName);
      if (currentSet) {
        currentSet.delete(listener as EventListener<any>);
        if (currentSet.size === 0) {
          this.listeners.delete(eventName);
          const release = this.nativeUnsubscribers.get(eventName);
          if (release) {
            this.nativeUnsubscribers.delete(eventName);
            release();
          }
        }
      }
    };
  }

  emit<T>(eventName: string, payload: T): void {
    const set = this.listeners.get(eventName);
    if (set) {
      for (const listener of set) {
        try {
          listener(payload);
        } catch (error) {
          // Prevent one failing listener from blocking other listeners
          console.error(`[StreamEventHub] Error in listener for ${eventName}:`, error);
        }
      }
    }
  }

  clear(): void {
    this.listeners.clear();
    for (const release of this.nativeUnsubscribers.values()) {
      try {
        release();
      } catch {
        // ignore — clearing is teardown-only
      }
    }
    this.nativeUnsubscribers.clear();
  }
}

export const streamEventHub = new StreamEventHub();

/**
 * Emit a streaming token event.
 */
export function emitStreamToken(requestId: string, token: string): void {
  streamEventHub.emit<StreamTokenPayload>(STREAM_TOKEN_EVENT, {
    requestId,
    token,
  });
}

/**
 * Emit a stream completion event.
 */
export function emitStreamDone(requestId: string, fullText: string, stopReason = 'completed'): void {
  streamEventHub.emit<StreamDonePayload>(STREAM_DONE_EVENT, {
    requestId,
    fullText,
    stopReason,
  });
}

/**
 * Subscribe to LLM streaming events by name (e.g. 'llm:stream-token' or 'llm:stream-done').
 * Compatible with the `@rustra/react-native` `subscribeEvent` signature.
 */
export function subscribeStreamEvent<T = unknown>(
  eventName: string,
  callback: (payload: T) => void,
): () => void {
  return streamEventHub.subscribe<T>(eventName, callback);
}

/**
 * Convenience helper to subscribe to token stream events.
 */
export function subscribeStreamToken(
  callback: (payload: StreamTokenPayload) => void,
): () => void {
  return subscribeStreamEvent<StreamTokenPayload>(STREAM_TOKEN_EVENT, callback);
}

/**
 * Convenience helper to subscribe to stream completion events.
 */
export function subscribeStreamDone(
  callback: (payload: StreamDonePayload) => void,
): () => void {
  return subscribeStreamEvent<StreamDonePayload>(STREAM_DONE_EVENT, callback);
}
