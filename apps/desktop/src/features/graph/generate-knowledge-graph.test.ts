import { describe, expect, test } from 'bun:test';
import { parseEdges } from './graph-edge-parser';

describe('desktop knowledge graph AI response parser', () => {
  test('extracts a JSON edge array from a fenced response', () => {
    expect(
      parseEdges('```json\n[{"itemAId":"a","itemBId":"b","reason":"related"}]\n```'),
    ).toEqual([{ itemAId: 'a', itemBId: 'b', reason: 'related' }]);
  });

  test('drops malformed or non-JSON responses', () => {
    expect(parseEdges('[{"itemAId":"a","itemBId":2,"reason":"bad"}]')).toEqual([]);
    expect(parseEdges('no graph')).toEqual([]);
  });

  test('prose citations do not poison array extraction', () => {
    expect(
      parseEdges(
        '결과 [1]을 참고 [{"itemAId":"a","itemBId":"b","reason":"ok"}]',
      ),
    ).toEqual([{ itemAId: 'a', itemBId: 'b', reason: 'ok' }]);
  });

  test('truncated responses keep earlier complete edges', () => {
    expect(
      parseEdges('[{"itemAId":"a","itemBId":"b","reason":"r"},{"itemAId":"c"'),
    ).toEqual([{ itemAId: 'a', itemBId: 'b', reason: 'r' }]);
  });
});
