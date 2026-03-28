import type { ReactNode } from 'react';

interface SplitPanelProps {
  primary: ReactNode;
  secondary?: ReactNode;
  showSecondary?: boolean;
}

export function SplitPanel({ primary, secondary, showSecondary = false }: SplitPanelProps) {
  return (
    <div className="flex h-full">
      <div
        className={`transition-all duration-200 ease-in-out ${
          showSecondary ? 'w-1/2 border-r border-border' : 'w-full'
        } overflow-auto`}
      >
        {primary}
      </div>
      <div
        className={`transition-all duration-200 ease-in-out overflow-auto ${
          showSecondary ? 'w-1/2 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        {showSecondary && secondary}
      </div>
    </div>
  );
}
