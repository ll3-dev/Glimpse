import type { KnowledgeItem } from '@glimpse/shared';
import {
  ArrowLeft,
  BookOpen,
  Camera,
  Highlighter,
  Link as LinkIcon,
  Network,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; badgeClass: string }
> = {
  note: { label: '메모', icon: BookOpen, badgeClass: 'bg-tag-mint-bg text-tag-mint-text border-tag-mint-text/20' },
  link: { label: '링크', icon: LinkIcon, badgeClass: 'bg-tag-sky-bg text-tag-sky-text border-tag-sky-text/20' },
  highlight: { label: '하이라이트', icon: Highlighter, badgeClass: 'bg-tag-peach-bg text-tag-peach-text border-tag-peach-text/20' },
  screenshot: { label: '스크린샷', icon: Camera, badgeClass: 'bg-tag-rose-bg text-tag-rose-text border-tag-rose-text/20' },
  share: { label: '공유', icon: Share2, badgeClass: 'bg-tag-lavender-bg text-tag-lavender-text border-tag-lavender-text/20' },
};

type KnowledgeItemDetailHeaderProps = {
  item: KnowledgeItem;
  onBack: () => void;
  onOpenGraph: () => void;
};

export function KnowledgeItemDetailHeader({ item, onBack, onOpenGraph }: KnowledgeItemDetailHeaderProps) {
  const typeInfo = TYPE_CONFIG[item.type] ?? {
    label: item.type,
    icon: BookOpen,
    badgeClass: 'bg-muted text-muted-foreground border-border',
  };
  const TypeIcon = typeInfo.icon;

  return (
    <div className="flex items-center gap-3 border-b border-border/80 px-8 py-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 px-2.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        뒤로
      </Button>
      <div className="h-4 w-px bg-border/60" />
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${typeInfo.badgeClass}`}>
          <TypeIcon className="h-3 w-3" />
          {typeInfo.label}
        </span>
        <span className="text-xs text-muted-foreground">ID: {item.id.slice(0, 8)}</span>
      </div>
      <Button variant="outline" size="sm" onClick={onOpenGraph} className="ml-auto gap-1.5">
        <Network className="h-3.5 w-3.5" />
        그래프에서 주변 보기
      </Button>
    </div>
  );
}
