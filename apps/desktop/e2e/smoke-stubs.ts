/**
 * Tauri IPC stub payloads for the browser smoke test.
 *
 * The desktop web bundle normally talks to the Rust side through
 * `window.__TAURI_INTERNALS__.invoke` (see main.tsx / @rustra/tauri). In a
 * plain browser there is no Tauri backend, so the Playwright init script
 * installs a fake `__TAURI_INTERNALS__` whose `invoke` resolves per-command:
 *
 * - rustra domain commands (listKnowledgeItems, ...) all ride the single
 *   `rustra_dispatch` command as `{ command, args }`; each unwraps to an
 *   envelope (`{ items }`, `{ item }`, ...). The stub returns empty
 *   envelopes so lists render empty instead of erroring.
 * - native shell commands (get_sync_status, LLM runtime commands) are
 *   invoked directly; safe defaults below keep their UI paths inert.
 * - LLM run commands reject: BYOK/local inference must never silently
 *   "succeed" with fake output during smoke runs.
 *
 * Commands outside the tables resolve to `{}` for `rustra_dispatch` and
 * reject for direct native invokes — extend these tables when the app shell
 * grows new startup-critical commands.
 */

/** rusta dispatch inner commands → envelope stubs. */
const RUSTA_STUBS: Record<string, unknown> = {
  listKnowledgeItems: { items: [] },
  listKnowledgeItemsByIds: { items: [] },
  listWeeklyKnowledgeItems: { items: [] },
  listPendingKnowledgeItemsForLabeling: { items: [] },
  getDueKnowledgeItems: { items: [] },
  getKnowledgeItemById: { item: null },
  listConversations: { conversations: [] },
  listConversationMessages: { messages: [] },
  listRecommendations: { recommendations: [] },
  listPendingRecommendations: { recommendations: [] },
  listRecentFeedbackEvents: { events: [] },
  calculateTagOverlap: { overlap: 0 },
};

/** Direct native commands → static result stubs. */
const NATIVE_STUBS: Record<string, unknown> = {
  // Desktop sync status polling (use-desktop-sync-status).
  get_sync_status: {
    protocolVersion: 1,
    deviceId: 'smoke-desktop',
    deviceName: 'Smoke Desktop',
    port: 0,
    pairingCode: '',
    pairingCodeExpiresInSeconds: 0,
    pairedClients: [],
    tailscale: {
      installed: false,
      connected: false,
      serveEnabled: false,
      dnsName: null,
      url: null,
      error: null,
    },
    startupError: null,
  },
  // Managed-model listings (settings/model manager).
  list_managed_models: [],
  list_available_runtimes: [],
  get_runtime_health: { healthy: false },
};

/** Native commands that must surface as failures, never silent success. */
const REJECTING_NATIVE_COMMANDS = [
  'run_completion',
  'stream_completion',
  'run_embedding',
  'load_model',
  'unload_model',
  'download_model',
  'cancel_download',
  'delete_model',
];

/** The init-script body installed by the Playwright config. */
export const tauriStubInitScript = `
  (() => {
    const rustaStubs = ${JSON.stringify(RUSTA_STUBS)};
    const nativeStubs = ${JSON.stringify(NATIVE_STUBS)};
    const rejecting = new Set(${JSON.stringify(REJECTING_NATIVE_COMMANDS)});
    const secretStore = new Map();
    let callbackSeq = 0;
    let eventListenerSeq = 0;
    const eventHandlers = new Map();
    window.__glimpseSmokeInvokedCommands = [];
    window.__glimpseSmokeEmitEvent = (event, payload) => {
      for (const handler of (eventHandlers.get(event) ?? new Map()).values()) {
        handler({ event, id: 0, payload });
      }
    };
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      unregisterListener(event, eventId) {
        const listeners = eventHandlers.get(event);
        if (!listeners) return;
        listeners.delete(eventId);
        if (listeners.size === 0) eventHandlers.delete(event);
      },
    };
    window.__TAURI_INTERNALS__ = {
      transformCallback(callback, once) {
        const id = ++callbackSeq;
        Object.defineProperty(window, \`_callback_\${id}\`, {
          value: callback,
          writable: false,
          configurable: true,
        });
        return id;
      },
      unregisterCallback() {},
      convertFileSrc(filePath) { return filePath; },
      async invoke(cmd, args) {
        window.__glimpseSmokeInvokedCommands.push(cmd);
        // Tauri event API rides plugin commands: listen/unregister/emit.
        if (cmd === 'plugin:event|listen') {
          const event = args && args.event ? String(args.event) : '';
          const handlerId = args && args.handler ? Number(args.handler) : 0;
          const handler = window[\`_callback_\${handlerId}\`];
          if (typeof handler === 'function') {
            const eventId = ++eventListenerSeq;
            const listeners = eventHandlers.get(event) ?? new Map();
            listeners.set(eventId, handler);
            eventHandlers.set(event, listeners);
            return Promise.resolve(eventId);
          }
          return Promise.resolve(++eventListenerSeq);
        }
        if (cmd === 'plugin:event|unlisten') {
          window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(
            args && args.event ? String(args.event) : '',
            args && args.eventId ? Number(args.eventId) : 0,
          );
          return Promise.resolve(undefined);
        }
        window.__glimpseSmokeInvokedCommands.push(cmd);
        if (cmd === 'rustra_dispatch') {
          const inner = args && args.command ? String(args.command) : '';
          return Promise.resolve(
            inner in rustaStubs ? structuredClone(rustaStubs[inner]) : {},
          );
        }
        if (cmd in nativeStubs) {
          return Promise.resolve(structuredClone(nativeStubs[cmd]));
        }
        if (cmd === 'set_secret') {
          secretStore.set(args.key, args.value);
          return undefined;
        }
        if (cmd === 'get_secret') {
          return secretStore.get(args.key) ?? null;
        }
        if (cmd === 'delete_secret') {
          secretStore.delete(args.key);
          return undefined;
        }
        if (rejecting.has(cmd)) {
          return Promise.reject(new Error(\`smoke stub rejects \${cmd}\`));
        }
        return Promise.reject(new Error(\`smoke stub has no handler for \${cmd}\`));
      },
    };
  })();
`;
