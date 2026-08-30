/**
 * LLM Stream Events (Mobile)
 *
 * Provides event push delivery for LLM streaming tokens and completion,
 * aligned with the desktop rustra event contracts (`llm:stream-token`, `llm:stream-done`).
 */

import {
  subscribeEvent,
  type RustraEventNative,
} from '@rustra/react-native';

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

/**
 * Native event push wiring — JSI `onEvent`/`offEvent` over the rustra FFI
 * event sink (CallInvoker-marshalled to the JS thread).
 *
 * Delegates to `@rustra/react-native`'s `subscribeEvent` (the 0.4.0 event
 * contract helper): the first subscriber of an event name registers the
 * native listener, the last unsubscribe releases it. Without the native
 * surface (Expo Go, tests), returns null — the hub stays local-only and
 * behavior is unchanged.
 */
function registerNativeListener(
  eventName: string,
  emit: (payload: unknown) => void,
): (() => void) | null {
  const native = (globalThis as { __rustraNative?: RustraEventNative })
    .__rustraNative;
  if (!native?.onEvent || !native?.offEvent) {
    return null;
  }

  try {
    return subscribeEvent(native, eventName, emit);
  } catch {
    return null;
  }
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
 *
 * NOTE: no production consumer today — mobile streaming completion resolves
 * through the JS promise path (`generateStream`), not this event. Kept as the
 * documented wire contract for `llm:stream-done` (desktop rustra parity);
 * only re-exports (llama-service.ts) and tests consume it.
 */
export function subscribeStreamDone(
  callback: (payload: StreamDonePayload) => void,
): () => void {
  return subscribeStreamEvent<StreamDonePayload>(STREAM_DONE_EVENT, callback);
}
