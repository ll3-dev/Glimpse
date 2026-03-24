import { useEffect, useState } from 'react';
import {
  DEFAULT_DESKTOP_LLM_OVERVIEW,
  getDesktopLLMOverview,
  type DesktopLLMOverview,
} from '../features/local-llm/desktop-llm-service';

export function useDesktopLLMOverview() {
  const [data, setData] = useState<DesktopLLMOverview>(DEFAULT_DESKTOP_LLM_OVERVIEW);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getDesktopLLMOverview()
      .then((next) => {
        if (!isMounted) {
          return;
        }
        setData(next);
        setError(null);
      })
      .catch((nextError: unknown) => {
        if (!isMounted) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : 'Failed to load desktop state.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
  };
}
