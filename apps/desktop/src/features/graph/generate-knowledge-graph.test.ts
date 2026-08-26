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
});
