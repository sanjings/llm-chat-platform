export const ModelType = {
  QWEN_MAX: 'qwen-max',
  DEEPSEEK_CHAT: 'deepseek-chat'
} as const;

export type ModelType = (typeof ModelType)[keyof typeof ModelType];

export const ResponseFormatType = {
  TEXT: 'text',
  MARKDOWN: 'markdown'
} as const;

export type ResponseFormatType = (typeof ResponseFormatType)[keyof typeof ResponseFormatType];
