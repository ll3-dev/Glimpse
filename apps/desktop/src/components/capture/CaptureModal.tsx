import { useState, useCallback } from 'react';
import { useRouter } from '@tanstack/react-router';
import { X, Save, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateInput, type KnowledgeItemInput } from '@glimpse/features/capture';
import { useSaveKnowledgeItemMutation } from '@glimpse/hooks';
import { useMetadataGeneration } from '@/features/ai/use-metadata-generation';
import type { KnowledgeItem } from '@glimpse/shared';
import { CaptureModalForm, type CaptureFormData } from './CaptureModalForm';

type CaptureType = 'note' | 'link' | 'highlight';

interface FieldErrors {
  [key: string]: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

const EMPTY_FORM: CaptureFormData = {
  title: '',
  body: '',
  url: '',
  text: '',
  sourceUrl: '',
  tags: '',
};

export function CaptureModal() {
  const router = useRouter();
  const saveMutation = useSaveKnowledgeItemMutation();
  const metadataMutation = useMetadataGeneration();

  const [activeType, setActiveType] = useState<CaptureType>('note');
  const [form, setForm] = useState<CaptureFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 저장 진행 중 닫기 차단 — 진행 중 입력 유실 방지
  const isBusy = saveMutation.isPending || metadataMutation.isPending;

  const handleClose = useCallback(() => {
    if (isBusy) return;
    router.history.back();
  }, [router, isBusy]);

  const updateField = useCallback((field: keyof CaptureFormData, value: string) => {
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

    // Generate metadata via the AI router (falls back to rules/stub automatically)
    let metadata;
    try {
      metadata = await metadataMutation.mutateAsync({ content, title: form.title || null });
    } catch {
      // Fallback: use truncated content as summary if AI generation fails
      metadata = {
        summary: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
        tags: [] as string[],
      };
    }
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
    >
      <button
        type="button"
        aria-label="Close capture modal"
        className="absolute inset-0 cursor-default"
        onClick={handleClose}
      />
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
            aria-label="Close capture modal"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <CaptureModalForm
          activeType={activeType}
          form={form}
          errors={errors}
          onTypeChange={(type) => {
            setActiveType(type);
            setErrors({});
          }}
          onFieldChange={updateField}
        />

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || metadataMutation.isPending}
            >
              {metadataMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {metadataMutation.isPending ? 'Generating metadata...' : saveMutation.isPending ? 'Saving...' : 'Save'}
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
