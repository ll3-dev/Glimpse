import { View } from 'react-native';
import { Text } from '@glimpse/ui/primitives';

type ChatMarkdownProps = {
  content: string;
  textClassName: string;
  mutedTextClassName?: string;
};

type InlineSegment =
  | { id: string; type: 'text'; value: string }
  | { id: string; type: 'bold'; value: string }
  | { id: string; type: 'code'; value: string };

type MarkdownBlock =
  | { id: string; type: 'code'; content: string }
  | { id: string; type: 'list'; items: { id: string; content: string }[] }
  | { id: string; type: 'heading'; level: 1 | 2 | 3; content: string }
  | { id: string; type: 'paragraph'; content: string };

function parseInlineSegments(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const value = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      segments.push({
        id: `text:${lastIndex}`,
        type: 'text',
        value: text.slice(lastIndex, index),
      });
    }

    if (value.startsWith('`')) {
      segments.push({ id: `code:${index}`, type: 'code', value: value.slice(1, -1) });
    } else {
      segments.push({ id: `bold:${index}`, type: 'bold', value: value.slice(2, -2) });
    }

    lastIndex = index + value.length;
  }

  if (lastIndex < text.length) {
    segments.push({ id: `text:${lastIndex}`, type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

function renderInline(text: string, textClassName: string) {
  return parseInlineSegments(text).map((segment) => {
    if (segment.type === 'bold') {
      return (
        <Text key={segment.id} className={`${textClassName} font-semibold`}>
          {segment.value}
        </Text>
      );
    }

    if (segment.type === 'code') {
      return (
        <Text
          key={segment.id}
          className={`${textClassName} rounded bg-black/10 px-1 font-mono text-[13px]`}
        >
          {segment.value}
        </Text>
      );
    }

    return (
      <Text key={segment.id} className={textClassName}>
        {segment.value}
      </Text>
    );
  });
}

export function ChatMarkdown({
  content,
  textClassName,
  mutedTextClassName = textClassName,
}: ChatMarkdownProps) {
  const lines = content.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index]?.trimEnd() ?? '';

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const blockStart = index;
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]?.trim().startsWith('```')) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }
      index += 1;
      blocks.push({ id: `code:${blockStart}`, type: 'code', content: codeLines.join('\n') });
      continue;
    }

    if (/^###\s+/.test(line)) {
      blocks.push({ id: `heading:${index}`, type: 'heading', level: 3, content: line.replace(/^###\s+/, '') });
      index += 1;
      continue;
    }

    if (/^##\s+/.test(line)) {
      blocks.push({ id: `heading:${index}`, type: 'heading', level: 2, content: line.replace(/^##\s+/, '') });
      index += 1;
      continue;
    }

    if (/^#\s+/.test(line)) {
      blocks.push({ id: `heading:${index}`, type: 'heading', level: 1, content: line.replace(/^#\s+/, '') });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const blockStart = index;
      const items: { id: string; content: string }[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index]?.trim() ?? '')) {
        items.push({
          id: `list-item:${index}`,
          content: (lines[index]?.trim() ?? '').replace(/^[-*]\s+/, ''),
        });
        index += 1;
      }
      blocks.push({ id: `list:${blockStart}`, type: 'list', items });
      continue;
    }

    const blockStart = index;
    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index]?.trim() &&
      !lines[index]?.trim().startsWith('```') &&
      !/^#{1,3}\s+/.test(lines[index]?.trim() ?? '') &&
      !/^[-*]\s+/.test(lines[index]?.trim() ?? '')
    ) {
      paragraphLines.push(lines[index]?.trim() ?? '');
      index += 1;
    }
    blocks.push({ id: `paragraph:${blockStart}`, type: 'paragraph', content: paragraphLines.join(' ') });
  }

  return (
    <View className="gap-2">
      {blocks.map((block) => {
        if (block.type === 'code') {
          return (
            <View key={block.id} className="rounded-xl bg-black/10 px-3 py-2">
              <Text className={`${mutedTextClassName} font-mono text-[13px]`}>
                {block.content}
              </Text>
            </View>
          );
        }

        if (block.type === 'list') {
          return (
            <View key={block.id} className="gap-1">
              {block.items.map((item) => (
                <View key={item.id} className="flex-row items-start">
                  <Text className={`${textClassName} mr-2`}>{'\u2022'}</Text>
                  <Text className={`${textClassName} flex-1`}>
                    {renderInline(item.content, textClassName)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === 'heading') {
          const headingClass =
            block.level === 1
              ? `${textClassName} text-lg font-semibold`
              : block.level === 2
                ? `${textClassName} text-base font-semibold`
                : `${textClassName} text-[15px] font-semibold`;

          return (
            <Text key={block.id} className={headingClass}>
              {renderInline(block.content, headingClass)}
            </Text>
          );
        }

        return (
          <Text key={block.id} className={textClassName}>
            {renderInline(block.content, textClassName)}
          </Text>
        );
      })}
    </View>
  );
}
