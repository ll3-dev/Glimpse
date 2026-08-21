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
  { key: 'note', label: 'Note' },
  { key: 'link', label: 'Link' },
  { key: 'highlight', label: 'Highlight' },
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
      <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTypeChange(tab.key)}
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

      <div className="space-y-4">
        <div>
          <label htmlFor="capture-title" className="mb-1.5 block text-sm font-medium text-foreground">
            Title <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="capture-title"
            type="text"
            value={form.title}
            onChange={(event) => onFieldChange('title', event.target.value)}
            placeholder="Enter a title..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {activeType === 'note' && (
          <div>
            <label htmlFor="capture-note-body" className="mb-1.5 block text-sm font-medium text-foreground">
              Body <span className="text-destructive">*</span>
            </label>
            <textarea
              id="capture-note-body"
              value={form.body}
              onChange={(event) => onFieldChange('body', event.target.value)}
              placeholder="Write your note..."
              rows={6}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            {errors.body && <p className="mt-1 text-xs text-destructive">{errors.body}</p>}
          </div>
        )}

        {activeType === 'link' && (
          <>
            <div>
              <label htmlFor="capture-link-url" className="mb-1.5 block text-sm font-medium text-foreground">
                URL <span className="text-destructive">*</span>
              </label>
              <input
                id="capture-link-url"
                type="url"
                value={form.url}
                onChange={(event) => onFieldChange('url', event.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              {errors.url && <p className="mt-1 text-xs text-destructive">{errors.url}</p>}
            </div>
            <div>
              <label htmlFor="capture-link-body" className="mb-1.5 block text-sm font-medium text-foreground">
                Body <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="capture-link-body"
                value={form.body}
                onChange={(event) => onFieldChange('body', event.target.value)}
                placeholder="Add a description..."
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </>
        )}

        {activeType === 'highlight' && (
          <>
            <div>
              <label htmlFor="capture-highlight-text" className="mb-1.5 block text-sm font-medium text-foreground">
                Text <span className="text-destructive">*</span>
              </label>
              <textarea
                id="capture-highlight-text"
                value={form.text}
                onChange={(event) => onFieldChange('text', event.target.value)}
                placeholder="Paste or type the highlighted text..."
                rows={6}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              {errors.text && <p className="mt-1 text-xs text-destructive">{errors.text}</p>}
            </div>
            <div>
              <label htmlFor="capture-highlight-source" className="mb-1.5 block text-sm font-medium text-foreground">
                Source URL <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="capture-highlight-source"
                type="url"
                value={form.sourceUrl}
                onChange={(event) => onFieldChange('sourceUrl', event.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="capture-tags" className="mb-1.5 block text-sm font-medium text-foreground">
            Tags <span className="text-muted-foreground">(optional, comma-separated)</span>
          </label>
          <input
            id="capture-tags"
            type="text"
            value={form.tags}
            onChange={(event) => onFieldChange('tags', event.target.value)}
            placeholder="e.g. design, reference, idea"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>
    </>
  );
}
