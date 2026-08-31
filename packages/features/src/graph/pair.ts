export function normalizeGraphPair(left: string, right: string): readonly [string, string] {
  return left < right ? [left, right] : [right, left];
}

export function graphPairKey(left: string, right: string): string {
  return normalizeGraphPair(left, right).join('\u0000');
}
