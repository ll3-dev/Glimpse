import { FileText, Link, Highlighter, Image, Share2 } from 'lucide-react-native';
import type { KnowledgeItem } from '@glimpse/shared';

/** Shared type→label/icon display config for knowledge items (library,
 * review, digest cards). Single source so labels and icons can't diverge. */
export const KNOWLEDGE_TYPE_CONFIG = {
  note: { label: '메모', Icon: FileText },
  link: { label: '링크', Icon: Link },
  highlight: { label: '하이라이트', Icon: Highlighter },
  screenshot: { label: '스크린샷', Icon: Image },
  share: { label: '공유', Icon: Share2 },
} as const;

export function getTypeConfig(type: KnowledgeItem['type']) {
  return KNOWLEDGE_TYPE_CONFIG[type] ?? { label: '항목', Icon: FileText };
}
