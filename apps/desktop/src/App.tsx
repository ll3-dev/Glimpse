import { DesktopShell } from './components/desktop/DesktopShell';
import { useDesktopLLMOverview } from './hooks/useDesktopLLMOverview';
import { workspaceArchitecture } from '@glimpse/shared';

export function App() {
  const { data, error, isLoading } = useDesktopLLMOverview();

  return (
    <DesktopShell
      architecture={workspaceArchitecture}
      data={data}
      error={error}
      isLoading={isLoading}
    />
  );
}
