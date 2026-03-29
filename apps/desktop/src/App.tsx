import { DesktopShell } from './components/desktop/DesktopShell';
import { useDesktopLLMOverview } from './features/local-llm/use-desktop-llm-overview';
import { DEFAULT_DESKTOP_LLM_OVERVIEW } from './features/local-llm/desktop-llm-service';
import { workspaceArchitecture } from '@glimpse/shared';

export function App() {
  const { data, error, isLoading } = useDesktopLLMOverview();

  return (
    <DesktopShell
      architecture={workspaceArchitecture}
      data={data ?? DEFAULT_DESKTOP_LLM_OVERVIEW}
      error={error?.message ?? null}
      isLoading={isLoading}
    />
  );
}
