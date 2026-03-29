import { useState, useCallback } from 'react';
import { useRouter } from '@tanstack/react-router';
import { X, Save, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateInput, type KnowledgeItemInput } from '@glimpse/features/capture';
import { useSaveKnowledgeItemMutation } from '@glimpse/hooks';
import type { KnowledgeItem } from '@glimpse/shared';

type CaptureType = 'note' | 'link' | 'highlight';

interface FormData {
  title: string;
  body: string;
  url: string;
  text: string;
  sourceUrl: string;
  tags: string;
}

interface FieldErrors {
  [key: string]: string;
}

async function generateMetadataStub(content: string, _title?: string | null) {
  return {
    summary: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
    tags: [] as string[],
  };
}

function generateId(): string {
  return crypto.randomUUID();
}

function isIdCollisionError(_error: unknown): boolean {
  return false;
}

const EMPTY_FORM: FormData = {
  title: '',
  body: '',
  url: '',
  text: '',
  sourceUrl: '',
  tags: '',
};

const TABS: { key: CaptureType; label: string }[] = [
  { key: 'note', label: 'Note' },
  { key: 'link', label: 'Link' },
  { key: 'highlight', label: 'Highlight' },
];

export function CaptureModal() {
  const router = useRouter();
  const saveMutation = useSaveKnowledgeItemMutation();

  const [activeType, setActiveType] = useState<CaptureType>('note');
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleClose = useCallback(() => {
    router.history.back();
  }, [router]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  function buildInput(): KnowledgeItemInput {
    const tagsArray = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    switch (activeType) {
      case 'note':
        return {
          type: 'note',
          title: form.title || null,
          body: form.body,
          tags: tagsArray.length > 0 ? tagsArray : null,
        };
      case 'link':
        return {
          type: 'link',
          url: form.url,
          title: form.title || null,
          body: form.body || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
        };
      case 'highlight':
        return {
          type: 'highlight',
          text: form.text,
          sourceUrl: form.sourceUrl || null,
          title: form.title || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
        };
    }
  }

  function validateForm(): FieldErrors {
    const input = buildInput();
    const validationErrors = validateInput(input);
    const fieldErrors: FieldErrors = {};
    for (const err of validationErrors) {
      fieldErrors[err.field] = err.message;
    }
    return fieldErrors;
  }

  async function handleSave() {
    const fieldErrors = validateForm();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const input = buildInput();
    const content = [form.title, form.body, form.url, form.text, form.sourceUrl]
      .filter(Boolean)
      .join('\n\n');
    const metadata = await generateMetadataStub(content, form.title || null);
    const now = Date.now();

    const tagsArray = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const item: KnowledgeItem = {
      id: generateId(),
      type: activeType,
      title: form.title || null,
      body: form.body || form.text || metadata.summary,
      url: form.url || form.sourceUrl || null,
      summary: metadata.summary,
      tags: tagsArray.length > 0 ? tagsArray : metadata.tags,
      labels: null,
      provisionalLabels: null,
      labelStatus: null,
      labelSource: null,
      labelVersion: null,
      labelScore: null,
      labelRequestedAt: null,
      labelCompletedAt: null,
      labelError: null,
      createdAt: now,
      updatedAt: now,
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
      nextReviewAt: now + 24 * 60 * 60 * 1000,
    };

    saveMutation.mutate(item, {
      onSuccess: () => {
        setToast({ message: 'Item saved successfully', type: 'success' });
        setForm(EMPTY_FORM);
        setErrors({});
        setTimeout(() => {
          handleClose();
        }, 600);
      },
      onError: (err) => {
        setToast({ message: `Save failed: ${String(err)}`, type: 'error' });
      },
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Capture</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveType(tab.key);
                setErrors({});
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeType === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Title - shown for all types */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Title <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Enter a title..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          {/* Note: body */}
          {activeType === 'note' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Body <span className="text-destructive">*</span>
              </label>
              <textarea
                value={form.body}
                onChange={(e) => updateField('body', e.target.value)}
                placeholder="Write your note..."
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
              />
              {errors.body && (
                <p className="mt-1 text-xs text-destructive">{errors.body}</p>
              )}
            </div>
          )}

          {/* Link: URL */}
          {activeType === 'link' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                URL <span className="text-destructive">*</span>
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              {errors.url && (
                <p className="mt-1 text-xs text-destructive">{errors.url}</p>
              )}
            </div>
          )}

          {/* Link: body */}
          {activeType === 'link' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Body <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={form.body}
                onChange={(e) => updateField('body', e.target.value)}
                placeholder="Add a description..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
              />
            </div>
          )}

          {/* Highlight: text */}
          {activeType === 'highlight' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Text <span className="text-destructive">*</span>
              </label>
              <textarea
                value={form.text}
                onChange={(e) => updateField('text', e.target.value)}
                placeholder="Paste or type the highlighted text..."
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
              />
              {errors.text && (
                <p className="mt-1 text-xs text-destructive">{errors.text}</p>
              )}
            </div>
          )}

          {/* Highlight: source URL */}
          {activeType === 'highlight' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Source URL <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                type="url"
                value={form.sourceUrl}
                onChange={(e) => updateField('sourceUrl', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          )}

          {/* Tags - shown for all types */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Tags <span className="text-muted-foreground">(optional, comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="e.g. design, reference, idea"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md px-4 py-2 text-sm font-medium shadow-lg transition-opacity ${
              toast.type === 'success'
                ? 'bg-primary text-primary-foreground'
                : 'bg-destructive text-white'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
