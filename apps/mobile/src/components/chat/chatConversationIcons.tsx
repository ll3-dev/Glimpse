import React from 'react';
import {
  MessageSquare,
  Brain,
  Bot,
  Sparkles,
  FileText,
  BookOpen,
  Compass,
  Search,
  Lightbulb,
  Zap,
  Bookmark,
  Code,
  type LucideIcon,
} from 'lucide-react-native';

export const CHAT_CONVERSATION_ICON_MAP: Record<string, LucideIcon> = {
  chat: MessageSquare,
  brain: Brain,
  bot: Bot,
  sparkles: Sparkles,
  note: FileText,
  book: BookOpen,
  idea: Lightbulb,
  compass: Compass,
  search: Search,
  zap: Zap,
  bookmark: Bookmark,
  code: Code,
  // Emoji backwards-compatibility aliases
  '💬': MessageSquare,
  '🧠': Brain,
  '🤖': Bot,
  '✨': Sparkles,
  '📝': FileText,
  '📚': BookOpen,
  '🎯': Compass,
  '🔍': Search,
  '💡': Lightbulb,
  '⚡': Zap,
};

export const CHAT_CONVERSATION_ICONS = [
  'chat',
  'brain',
  'bot',
  'sparkles',
  'note',
  'book',
  'idea',
  'compass',
  'search',
  'zap',
  'bookmark',
  'code',
] as const;

export type ConversationIconKey = (typeof CHAT_CONVERSATION_ICONS)[number];

export function getConversationIcon(icon: string | null | undefined): LucideIcon | null {
  if (!icon) return null;
  return CHAT_CONVERSATION_ICON_MAP[icon] ?? MessageSquare;
}

export function ConversationIcon({
  icon,
  size = 16,
  color,
}: {
  icon: string | null | undefined;
  size?: number;
  color?: string;
}) {
  if (!icon) return null;
  const IconComponent = CHAT_CONVERSATION_ICON_MAP[icon] ?? MessageSquare;
  return React.createElement(IconComponent, { size, color });
}
