export interface ProposedEdge {
  itemAId: string;
  itemBId: string;
  reason: string;
}

export function parseEdges(text: string): ProposedEdge[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const edge = value as Partial<ProposedEdge>;
      if (
        typeof edge.itemAId !== 'string' ||
        typeof edge.itemBId !== 'string' ||
        typeof edge.reason !== 'string'
      ) {
        return [];
      }
      return [{ itemAId: edge.itemAId, itemBId: edge.itemBId, reason: edge.reason }];
    });
  } catch {
    return [];
  }
}
