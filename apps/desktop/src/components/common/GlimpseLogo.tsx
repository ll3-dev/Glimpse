import type { SVGProps } from 'react';

interface GlimpseLogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
  withBackground?: boolean;
}

export function GlimpseLogo({
  size = 24,
  withBackground = false,
  className = '',
  ...props
}: GlimpseLogoProps) {
  if (withBackground) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label="Glimpse"
        {...props}
      >
        <rect width="1024" height="1024" rx="224" fill="#f7f6f3" />
        <rect x="248" y="248" width="528" height="528" rx="176" fill="#37352f"/>
        <rect x="534" y="332" width="166" height="166" rx="62" fill="#ffe8d4"/>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 528 528"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Glimpse"
      {...props}
    >
      <rect width="528" height="528" rx="176" fill="#37352f" />
      <rect x="286" y="84" width="166" height="166" rx="62" fill="#ffe8d4"/>
    </svg>
  );
}
