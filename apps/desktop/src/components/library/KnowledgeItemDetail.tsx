import type { KnowledgeItem } from '@glimpse/shared';
import {
  ArrowLeft,
  Calendar,
  Tag,
  ExternalLink,
  Brain,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatKnowledgeLabel, getDisplayLabels } from '@/features/labeling';

interface KnowledgeItemDetailProps {
  item: KnowledgeItem;
  onBack: () => void;
}

function formatDate(ts: number | null): string {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function KnowledgeItemDetail({ item, onBack }: KnowledgeItemDetailProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{item.type}</Badge>
            <span className="text-xs text-muted-foreground">ID: {item.id.slice(0, 8)}...</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Title */}
          {item.title && (
            <div>
              <h1 className="text-xl font-semibold">{item.title}</h1>
            </div>
          )}

          {/* Body */}
          {item.body && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Content</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>
            </div>
          )}

          {/* URL */}
          {item.url && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">URL</h3>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {item.url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Summary */}
          {item.summary && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Summary</h3>
              <p className="text-sm text-muted-foreground">{item.summary}</p>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Labels */}
          {getDisplayLabels(item).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Labels</h3>
              <div className="flex flex-wrap gap-1.5">
                {getDisplayLabels(item).map((label) => (
                  <Badge key={label} variant="outline">
                    {formatKnowledgeLabel(label)}
                  </Badge>
                ))}
              </div>
              {item.labelStatus && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  <span>
                    {item.labelSource === 'rules' ? 'Rule-based' : item.labelSource}
                    {' · '}
                    {item.labelStatus}
                    {item.labelScore != null && ` · score ${item.labelScore.toFixed(2)}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Review Info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-medium">Review Status</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created: {formatDate(item.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Updated: {formatDate(item.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Brain className="h-4 w-4" />
                <span>Last Review: {formatDate(item.lastReviewedAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <span>Next Review: {formatDate(item.nextReviewAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
