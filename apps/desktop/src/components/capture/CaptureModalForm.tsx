type CaptureType = 'note' | 'link' | 'highlight';

export interface CaptureFormData {
  title: string;
  body: string;
  url: string;
  text: string;
  sourceUrl: string;
  tags: string;
}

interface CaptureModalFormProps {
  activeType: CaptureType;
  form: CaptureFormData;
  errors: Record<string, string>;
  onTypeChange: (type: CaptureType) => void;
  onFieldChange: (field: keyof CaptureFormData, value: string) => void;
}

const TABS: { key: CaptureType; label: string }[] = [
  { key: 'note', label: '메모' },
  { key: 'link', label: '링크' },
  { key: 'highlight', label: '하이라이트' },
];

export function CaptureModalForm({
  activeType,
  form,
  errors,
  onTypeChange,
  onFieldChange,
}: CaptureModalFormProps) {
  return (
    <>
      <div className="mb-5 flex gap-1 rounded-xl bg-muted/60 p-1 border border-border/60">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTypeChange(tab.key)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeType === tab.key
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="capture-title" className="mb-1.5 block text-xs font-semibold text-foreground">
            제목 <span className="text-muted-foreground font-normal">(선택사항)</span>
          </label>
          <input
            id="capture-title"
            type="text"
            value={form.title}
            onChange={(event) => onFieldChange('title', event.target.value)}
            placeholder="지식 항목의 제목을 입력하세요..."
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
          />
        </div>

        {activeType === 'note' && (
          <div>
            <label htmlFor="capture-note-body" className="mb-1.5 block text-xs font-semibold text-foreground">
              본문 메모 <span className="text-destructive">*</span>
            </label>
            <textarea
              id="capture-note-body"
              value={form.body}
              onChange={(event) => onFieldChange('body', event.target.value)}
              placeholder="생각이나 메모를 자유롭게 적어보세요..."
              rows={6}
              className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
            />
            {errors.body && <p className="mt-1 text-xs text-destructive">{errors.body}</p>}
          </div>
        )}

        {activeType === 'link' && (
          <>
            <div>
              <label htmlFor="capture-link-url" className="mb-1.5 block text-xs font-semibold text-foreground">
                웹페이지 URL <span className="text-destructive">*</span>
              </label>
              <input
                id="capture-link-url"
                type="url"
                value={form.url}
                onChange={(event) => onFieldChange('url', event.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
              />
              {errors.url && <p className="mt-1 text-xs text-destructive">{errors.url}</p>}
            </div>
            <div>
              <label htmlFor="capture-link-body" className="mb-1.5 block text-xs font-semibold text-foreground">
                설명 <span className="text-muted-foreground font-normal">(선택사항)</span>
              </label>
              <textarea
                id="capture-link-body"
                value={form.body}
                onChange={(event) => onFieldChange('body', event.target.value)}
                placeholder="링크에 대한 추가 설명이나 요약..."
                rows={4}
                className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
              />
            </div>
          </>
        )}

        {activeType === 'highlight' && (
          <>
            <div>
              <label htmlFor="capture-highlight-text" className="mb-1.5 block text-xs font-semibold text-foreground">
                발췌 내용 <span className="text-destructive">*</span>
              </label>
              <textarea
                id="capture-highlight-text"
                value={form.text}
                onChange={(event) => onFieldChange('text', event.target.value)}
                placeholder="중요한 문장이나 인용구를 입력하세요..."
                rows={6}
                className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
              />
              {errors.text && <p className="mt-1 text-xs text-destructive">{errors.text}</p>}
            </div>
            <div>
              <label htmlFor="capture-highlight-source" className="mb-1.5 block text-xs font-semibold text-foreground">
                출처 URL <span className="text-muted-foreground font-normal">(선택사항)</span>
              </label>
              <input
                id="capture-highlight-source"
                type="url"
                value={form.sourceUrl}
                onChange={(event) => onFieldChange('sourceUrl', event.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="capture-tags" className="mb-1.5 block text-xs font-semibold text-foreground">
            태그 <span className="text-muted-foreground font-normal">(선택사항, 쉼표로 구분)</span>
          </label>
          <input
            id="capture-tags"
            type="text"
            value={form.tags}
            onChange={(event) => onFieldChange('tags', event.target.value)}
            placeholder="예: design, rust, 인공지능"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
          />
        </div>
      </div>
    </>
  );
}
