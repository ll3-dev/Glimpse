import type { KnowledgeItem } from '@glimpse/shared';
import type { KnowledgeLabel, LabelingResult } from './types';

export const RULE_BASED_LABELER_VERSION = 'rules-v1';
const LABEL_PRIORITY: KnowledgeLabel[] = [
  'todo',
  'project',
  'meeting',
  'work',
  'learning',
  'reference',
  'idea',
  'inspiration',
  'finance',
  'health',
  'travel',
  'personal',
];

const TODO_KEYWORDS = ['todo', 'to do', 'follow up', 'action item', 'reply', 'send', 'fix'];
const IDEA_KEYWORDS = ['idea', 'brainstorm', 'concept', 'draft', 'experiment'];
const LEARNING_KEYWORDS = ['learn', 'study', 'tutorial', 'guide', 'research', 'read', 'docs'];
const MEETING_KEYWORDS = ['meeting', 'sync', '1:1', 'standup', 'retro', 'agenda'];
const FINANCE_KEYWORDS = ['budget', 'price', 'cost', 'invoice', 'payment', 'subscription'];
const HEALTH_KEYWORDS = ['health', 'workout', 'exercise', 'sleep', 'meal'];
const TRAVEL_KEYWORDS = ['flight', 'hotel', 'trip', 'travel', 'itinerary', 'booking'];
const INSPIRATION_KEYWORDS = ['inspiration', 'inspiring', 'design', 'reference', 'moodboard'];
const WORK_KEYWORDS = ['client', 'roadmap', 'ship', 'release', 'sprint', 'ticket'];
const PROJECT_KEYWORDS = ['project', 'milestone', 'launch', 'spec', 'pr'];
const TODO_KEYWORDS_KO = ['할 일', '해야', '해야 함', '후속', '답장', '보내기', '수정', '작업'];
const IDEA_KEYWORDS_KO = ['아이디어', '생각', '초안', '실험', '브레인스토밍', '컨셉'];
const LEARNING_KEYWORDS_KO = ['공부', '학습', '튜토리얼', '가이드', '리서치', '읽기', '문서'];
const MEETING_KEYWORDS_KO = ['회의', '미팅', '싱크', '스탠드업', '회고', '아젠다', '1:1'];
const FINANCE_KEYWORDS_KO = ['예산', '가격', '비용', '영수증', '결제', '구독', '세금'];
const HEALTH_KEYWORDS_KO = ['건강', '운동', '수면', '식단', '병원', '약'];
const TRAVEL_KEYWORDS_KO = ['여행', '비행기', '호텔', '숙소', '일정', '예약'];
const INSPIRATION_KEYWORDS_KO = ['영감', '레퍼런스', '디자인', '무드보드', '사례'];
const WORK_KEYWORDS_KO = ['업무', '회사', '클라이언트', '로드맵', '배포', '스프린트', '티켓'];
const PROJECT_KEYWORDS_KO = ['프로젝트', '마일스톤', '런치', '명세', '기획'];

const LABEL_DISPLAY_NAMES: Record<KnowledgeLabel, string> = {
  todo: '할 일',
  idea: '아이디어',
  reference: '참고자료',
  learning: '학습',
  work: '업무',
  personal: '개인',
  meeting: '회의',
  project: '프로젝트',
  finance: '금융',
  health: '건강',
  travel: '여행',
  inspiration: '영감',
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function includesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function parseHostname(url: string | null | undefined): string {
  if (!url) {
    return '';
  }

  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function addLabel(target: Set<KnowledgeLabel>, label: KnowledgeLabel): void {
  target.add(label);
}

export function deriveRuleBasedLabels(item: KnowledgeItem): LabelingResult {
  const labels = new Set<KnowledgeLabel>();
  const text = [
    normalizeText(item.title),
    normalizeText(item.body),
    normalizeText(item.summary),
    ...(item.tags ?? []).map((tag) => normalizeText(tag)),
  ]
    .filter(Boolean)
    .join(' ');
  const hostname = parseHostname(item.url);

  if (item.type === 'link' || item.type === 'highlight' || hostname.length > 0) {
    addLabel(labels, 'reference');
  }

  if (hostname.includes('github.com') || hostname.includes('linear.app')) {
    addLabel(labels, 'work');
    addLabel(labels, 'project');
  }

  if (
    hostname.includes('docs.') ||
    hostname.includes('developer.') ||
    hostname.includes('wikipedia.org')
  ) {
    addLabel(labels, 'learning');
    addLabel(labels, 'reference');
  }

  if (hostname.includes('youtube.com') || hostname.includes('coursera.org')) {
    addLabel(labels, 'learning');
  }

  if (includesAny(text, TODO_KEYWORDS)) {
    addLabel(labels, 'todo');
  }
  if (includesAny(text, TODO_KEYWORDS_KO)) {
    addLabel(labels, 'todo');
  }
  if (includesAny(text, IDEA_KEYWORDS)) {
    addLabel(labels, 'idea');
    addLabel(labels, 'inspiration');
  }
  if (includesAny(text, IDEA_KEYWORDS_KO)) {
    addLabel(labels, 'idea');
    addLabel(labels, 'inspiration');
  }
  if (includesAny(text, LEARNING_KEYWORDS)) {
    addLabel(labels, 'learning');
  }
  if (includesAny(text, LEARNING_KEYWORDS_KO)) {
    addLabel(labels, 'learning');
  }
  if (includesAny(text, MEETING_KEYWORDS)) {
    addLabel(labels, 'meeting');
    addLabel(labels, 'work');
  }
  if (includesAny(text, MEETING_KEYWORDS_KO)) {
    addLabel(labels, 'meeting');
    addLabel(labels, 'work');
  }
  if (includesAny(text, FINANCE_KEYWORDS)) {
    addLabel(labels, 'finance');
  }
  if (includesAny(text, FINANCE_KEYWORDS_KO)) {
    addLabel(labels, 'finance');
  }
  if (includesAny(text, HEALTH_KEYWORDS)) {
    addLabel(labels, 'health');
  }
  if (includesAny(text, HEALTH_KEYWORDS_KO)) {
    addLabel(labels, 'health');
  }
  if (includesAny(text, TRAVEL_KEYWORDS)) {
    addLabel(labels, 'travel');
  }
  if (includesAny(text, TRAVEL_KEYWORDS_KO)) {
    addLabel(labels, 'travel');
  }
  if (includesAny(text, INSPIRATION_KEYWORDS)) {
    addLabel(labels, 'inspiration');
    addLabel(labels, 'reference');
  }
  if (includesAny(text, INSPIRATION_KEYWORDS_KO)) {
    addLabel(labels, 'inspiration');
    addLabel(labels, 'reference');
  }
  if (includesAny(text, WORK_KEYWORDS)) {
    addLabel(labels, 'work');
  }
  if (includesAny(text, WORK_KEYWORDS_KO)) {
    addLabel(labels, 'work');
  }
  if (includesAny(text, PROJECT_KEYWORDS)) {
    addLabel(labels, 'project');
  }
  if (includesAny(text, PROJECT_KEYWORDS_KO)) {
    addLabel(labels, 'project');
  }

  if (labels.size === 0) {
    addLabel(labels, item.type === 'link' ? 'reference' : 'personal');
  }

  const prioritizedLabels = [...labels].sort(
    (left, right) => LABEL_PRIORITY.indexOf(left) - LABEL_PRIORITY.indexOf(right)
  );

  return {
    labels: prioritizedLabels.slice(0, 3),
    score: Math.min(1, 0.35 + labels.size * 0.15),
    source: 'rules',
    version: RULE_BASED_LABELER_VERSION,
  };
}

export function getDisplayLabels(item: {
  labels?: string[] | null;
  provisionalLabels?: string[] | null;
}): string[] {
  if (item.labels && item.labels.length > 0) {
    return item.labels;
  }

  return item.provisionalLabels ?? [];
}

export function formatKnowledgeLabel(label: string): string {
  return LABEL_DISPLAY_NAMES[label as KnowledgeLabel] ?? label;
}
