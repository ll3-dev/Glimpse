import { describe, expect, it, beforeEach } from 'bun:test';
import {
  STREAM_DONE_EVENT,
  STREAM_TOKEN_EVENT,
  emitStreamDone,
  emitStreamToken,
  streamEventHub,
  subscribeStreamDone,
  subscribeStreamEvent,
  subscribeStreamToken,
} from './stream-events';

describe('stream-events', () => {
  beforeEach(() => {
    streamEventHub.clear();
  });

  it('delivers token events to subscribers via subscribeStreamToken', () => {
    const received: { requestId: string; token: string }[] = [];

    const unsubscribe = subscribeStreamToken((payload) => {
      received.push(payload);
    });

    emitStreamToken('req-1', '안');
    emitStreamToken('req-1', '녕');
    emitStreamToken('req-2', '다른요청');

    expect(received).toEqual([
      { requestId: 'req-1', token: '안' },
      { requestId: 'req-1', token: '녕' },
      { requestId: 'req-2', token: '다른요청' },
    ]);

    unsubscribe();

    emitStreamToken('req-1', '무시되어야함');
    expect(received.length).toBe(3);
  });

  it('delivers completion events to subscribers via subscribeStreamDone', () => {
    const received: { requestId: string; fullText: string; stopReason: string }[] = [];

    const unsubscribe = subscribeStreamDone((payload) => {
      received.push(payload);
    });

    emitStreamDone('req-1', '안녕하세요', 'completed');

    expect(received).toEqual([
      { requestId: 'req-1', fullText: '안녕하세요', stopReason: 'completed' },
    ]);

    unsubscribe();
  });

  it('supports generic subscribeStreamEvent for rustra event names', () => {
    const tokens: string[] = [];
    const dones: string[] = [];

    const un1 = subscribeStreamEvent<{ requestId: string; token: string }>(
      STREAM_TOKEN_EVENT,
      (payload) => {
        tokens.push(payload.token);
      },
    );

    const un2 = subscribeStreamEvent<{ requestId: string; fullText: string }>(
      STREAM_DONE_EVENT,
      (payload) => {
        dones.push(payload.fullText);
      },
    );

    emitStreamToken('req-1', 'Test');
    emitStreamDone('req-1', 'Test Done');

    expect(tokens).toEqual(['Test']);
    expect(dones).toEqual(['Test Done']);

    un1();
    un2();
  });
});
