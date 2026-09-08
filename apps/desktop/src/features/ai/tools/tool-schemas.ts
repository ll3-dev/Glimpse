/**
 * Chat tool wire schemas — OpenAI function-calling 형식의 도구 선언.
 * 실행기(executor)는 tool-definitions.ts에 있다.
 */

/** OpenAI function-calling wire schema. */
export interface ChatToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export const CHAT_TOOL_SCHEMAS: ChatToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'list_recent_knowledge',
      description:
        '사용자의 지식 라이브러리에서 가장 최근에 저장된 항목들을 반환한다. "오늘/최근에 뭐 저장했지?" 같은 질문에 먼저 사용한다.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '반환할 항목 수 (기본 5, 최대 20)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description:
        '지식 라이브러리를 의미 검색한다. 사용자의 질문과 관련된 노트/링크/하이라이트를 찾을 때 사용한다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색 질의' },
          limit: {
            type: 'number',
            description: '반환할 항목 수 (기본 5, 최대 20)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_note',
      description:
        '새 노트를 지식 라이브러리에 저장한다. 사용자가 저장을 명시적으로 요청했을 때만 사용한다.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '노트 제목 (선택)' },
          body: { type: 'string', description: '노트 본문' },
        },
        required: ['body'],
      },
    },
  },
];

