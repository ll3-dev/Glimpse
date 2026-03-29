import type {
  DesktopLLMOverview,
  DesktopLLMRuntimeDescriptor,
  ManagedModelRecord,
} from '../../features/local-llm/desktop-llm-service';
import type { WorkspaceArchitecture } from '@glimpse/shared';
import { styles } from './styles';

interface DesktopShellProps {
  architecture: WorkspaceArchitecture;
  data: DesktopLLMOverview;
  isLoading: boolean;
  error: string | null;
}

export function DesktopShell({
  architecture,
  data,
  isLoading,
  error,
}: DesktopShellProps) {
  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.hero}>
          <div style={styles.eyebrow}>
            <span>Glimpse Desktop</span>
            <span>{architecture.desktopShell}</span>
          </div>
          <h1 style={styles.title}>Managed local LLMs for a resident desktop shell</h1>
          <p style={styles.subtitle}>
            {architecture.mobileApp} shares contracts with {architecture.sharedPackage}, while{' '}
            {architecture.desktopApp} hosts GGUF models, Apple-native fallback, and BYOK routing
            behind Tauri.
          </p>
          {isLoading ? <p style={styles.helper}>Refreshing desktop runtime state...</p> : null}
          {error ? <p style={styles.error}>{error}</p> : null}
        </header>

        <section style={styles.card}>
          <div style={styles.grid}>
            <div style={styles.column}>
              <div>
                <h2 style={styles.sectionTitle}>Runtime Priority</h2>
                <div style={styles.runtimeRow}>
                  {data.runtimes.map((runtime: DesktopLLMRuntimeDescriptor) => (
                    <div
                      key={runtime.id}
                      style={{
                        ...styles.pill,
                        ...(runtime.availability === 'available' ? null : styles.pillMuted),
                      }}
                    >
                      <span>{runtime.priority}</span>
                      <span>{runtime.displayName}</span>
                    </div>
                  ))}
                </div>
                <p style={styles.helper}>
                  Managed local stays first, Apple-native remains optional, and BYOK is the final
                  fallback when device execution is unavailable.
                </p>
              </div>

              <div>
                <h2 style={styles.sectionTitle}>Managed GGUF Models</h2>
                <div style={styles.column}>
                  {data.models.map((model: ManagedModelRecord) => (
                    <article key={model.id} style={styles.modelCard}>
                      <div>
                        <strong>{model.name}</strong>
                        <p style={styles.modelMeta}>
                          {model.family} · {model.quantization} · context {model.contextLength}
                        </p>
                      </div>
                      <div style={styles.statList}>
                        <div style={styles.statItem}>
                          <span style={styles.statLabel}>Status</span>
                          <span style={styles.statValue}>{model.status}</span>
                        </div>
                        <div style={styles.statItem}>
                          <span style={styles.statLabel}>Format</span>
                          <span style={styles.statValue}>{model.format.toUpperCase()}</span>
                        </div>
                        <div style={styles.statItem}>
                          <span style={styles.statLabel}>Embedding</span>
                          <span style={styles.statValue}>
                            {model.supportsEmbedding ? 'supported' : 'not supported'}
                          </span>
                        </div>
                        <div style={styles.statItem}>
                          <span style={styles.statLabel}>Tools</span>
                          <span style={styles.statValue}>
                            {model.supportsTools ? 'supported' : 'not supported'}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.column}>
              <div>
                <h2 style={styles.sectionTitle}>Memory Policy</h2>
                <div style={styles.statList}>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>Max active models</span>
                    <span style={styles.statValue}>{data.memoryPolicy.maxActiveModels}</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>Idle unload</span>
                    <span style={styles.statValue}>
                      {Math.round(data.memoryPolicy.idleUnloadMs / 60000)} min
                    </span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>Queue limit while syncing</span>
                    <span style={styles.statValue}>
                      {data.memoryPolicy.maxQueueDepthWhenSyncing}
                    </span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>Aggressive preload</span>
                    <span style={styles.statValue}>
                      {data.memoryPolicy.allowAggressivePreload ? 'enabled' : 'disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h2 style={styles.sectionTitle}>Runtime Health</h2>
                <div style={styles.statList}>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>Status</span>
                    <span style={styles.statValue}>{data.health.status}</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>Loaded model</span>
                    <span style={styles.statValue}>{data.health.loadedModelId ?? 'none'}</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>Memory pressure</span>
                    <span style={styles.statValue}>{data.health.memoryPressure}</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>Queue depth</span>
                    <span style={styles.statValue}>{data.health.queueDepth}</span>
                  </div>
                </div>
              </div>

              <div>
                <h2 style={styles.sectionTitle}>Desktop Notes</h2>
                <p style={styles.helper}>
                  This shell now has a real Vite frontend, Tauri command bridge, and mocked
                  runtime state that can be replaced with actual llama.cpp-backed Rust execution
                  without changing the UI contract.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
