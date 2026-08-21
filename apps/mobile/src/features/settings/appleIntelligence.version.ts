import type { AppleIntelligencePlatform } from './appleIntelligence.types';

const MIN_VERSIONS = {
  ios: '26.0',
  macos: '26.0',
} as const;

function parseVersion(version: string): number[] {
  return version.split('.').map((segment) => Number.parseInt(segment, 10) || 0);
}

export function compareVersions(a: string, b: string): number {
  const aParts = parseVersion(a);
  const bParts = parseVersion(b);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;

    if (aVal > bVal) {
      return 1;
    }

    if (aVal < bVal) {
      return -1;
    }
  }

  return 0;
}

export function checkAppleIntelligenceAvailability(platform: AppleIntelligencePlatform): {
  available: boolean;
  reason?: string;
} {
  const { OS, Version } = platform;

  if (OS !== 'ios' && OS !== 'macos') {
    return {
      available: false,
      reason: 'Apple Intelligence는 Apple 기기에서만 사용할 수 있습니다',
    };
  }

  const minVersion = OS === 'ios' ? MIN_VERSIONS.ios : MIN_VERSIONS.macos;
  const currentVersion = String(Version);

  if (compareVersions(currentVersion, minVersion) < 0) {
    return {
      available: false,
      reason: `${OS === 'ios' ? 'iOS' : 'macOS'} ${minVersion} 이상이 필요합니다`,
    };
  }

  return { available: true };
}
