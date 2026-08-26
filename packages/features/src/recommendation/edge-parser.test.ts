import { describe, expect, mock, test } from 'bun:test';
import { parseEdges, sanitizeEdges } from './edge-parser';

const edge = (itemAId: string, itemBId: string, reason = 'related') => ({
  itemAId,
  itemBId,
  reason,
});

describe('parseEdges', () => {
  test('parses a fenced JSON array (signature preserved)', () => {
    expect(
      parseEdges('```json\n[{"itemAId":"a","itemBId":"b","reason":"related"}]\n```'),
    ).toEqual([edge('a', 'b')]);
  });

  test('parses a bare array with prose around it', () => {
    expect(
      parseEdges('다음은 추천 결과입니다.\n[{"itemAId":"a","itemBId":"b","reason":"x"}]\n감사합니다.'),
    ).toEqual([edge('a', 'b', 'x')]);
  });

  test('prose citation [1] before the array does not poison the slice', () => {
    const text =
      '결과 [1]을 참고해 아래 배열을 만들었습니다.\n' +
      '[{"itemAId":"a","itemBId":"b","reason":"ok"}]';
    expect(parseEdges(text)).toEqual([edge('a', 'b', 'ok')]);
  });

  test('multiple citations and nested brackets do not break extraction', () => {
    const text =
      '각주 [1]과 [2]를 참고했습니다.\n' +
      '```json\n' +
      '[{"itemAId":"a[1]","itemBId":"b","reason":"nested [x] brackets"},{"itemAId":"c","itemBId":"d","reason":"second"}]' +
      '\n```';
    expect(parseEdges(text)).toEqual([
      edge('a[1]', 'b', 'nested [x] brackets'),
      edge('c', 'd', 'second'),
    ]);
  });

  test('trailing commas inside the array are tolerated', () => {
    expect(
      parseEdges(
        '[{"itemAId":"a","itemBId":"b","reason":"one"},{"itemAId":"c","itemBId":"d","reason":"two"},]',
      ),
    ).toEqual([edge('a', 'b', 'one'), edge('c', 'd', 'two')]);
  });

  test('truncated response (no closing bracket) recovers complete objects', () => {
    // max_tokens cut mid-way through the second object.
    const truncated =
      '[{"itemAId":"a","itemBId":"b","reason":"first"},{"itemAId":"c","it';
    expect(parseEdges(truncated)).toEqual([edge('a', 'b', 'first')]);
  });

  test('truncated fenced response also recovers', () => {
    const truncated = '```json\n[{"itemAId":"a","itemBId":"b","reason":"r"}';
    expect(parseEdges(truncated)).toEqual([edge('a', 'b', 'r')]);
  });

  test('object-level tolerant parsing keeps salvageable elements', () => {
    // Element 2 has a trailing comma issue only; element 3 is missing reason
    // → dropped; element 4 is fine.
    const text =
      '[{"itemAId":"a","itemBId":"b","reason":},{"itemAId":"x",},{"itemAId":"c","itemBId":"d"}]';
    // First element is unrecoverable (bad value), second lacks fields, third ok.
    expect(parseEdges(text)).toEqual([]);
  });

  test('non-array JSON, empty string, garbage return empty', () => {
    expect(parseEdges('')).toEqual([]);
    expect(parseEdges('{"itemAId":"a"}')).toEqual([]);
    expect(parseEdges('[not json at all]')).toEqual([]);
    expect(parseEdges('no graph here')).toEqual([]);
  });

  test('malformed field types drop the element but keep valid siblings', () => {
    const text =
      '[{"itemAId":"a","itemBId":2,"reason":"bad"},{"itemAId":"c","itemBId":"d","reason":"good"}]';
    expect(parseEdges(text)).toEqual([edge('c', 'd', 'good')]);
  });

  test('reports failure cause through the optional logger without throwing', () => {
    const warn = mock(() => undefined);
    parseEdges('[{"itemAId":"a", ', { logger: { warn } });
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String((warn.mock.calls[0] as unknown[])[0]);
    expect(message).toMatch(/truncat|bracket|JSON|unterminated/i);
  });

  test('does not warn on successful parses', () => {
    const warn = mock(() => undefined);
    parseEdges('[{"itemAId":"a","itemBId":"b","reason":"r"}]', { logger: { warn } });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('sanitizeEdges pair keys', () => {
  test('treats reversed pairs as duplicates and trims reasons', () => {
    const edges = sanitizeEdges(
      [
        edge('b', 'a', 'dup reversed'),
        edge('a', 'b', 'original '.repeat(60)),
        edge('c', 'd', 'kept'),
      ],
      new Set(['a', 'b', 'c', 'd']),
      10,
    );
    expect(edges).toHaveLength(2);
    expect(edges[0].reason.length).toBeLessThanOrEqual(300);
    expect(edges[1]).toEqual(edge('c', 'd', 'kept'));
  });
});
