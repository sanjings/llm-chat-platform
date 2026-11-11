/** 与后端可选列表一致，取值即上游官方模型名 */
export const ModelType = {
  QWEN3_8_MAX: 'qwen3.8-max',
  QWEN3_7_PLUS: 'qwen3.7-plus',
  QWEN3_8_FLASH: 'qwen3.8-flash',
  DEEPSEEK_FLASH: 'deepseek-flash',
  DEEPSEEK_V4_PRO: 'deepseek-v4-pro'
} as const;

export type ModelType = (typeof ModelType)[keyof typeof ModelType];

export const DEFAULT_MODEL_ID: ModelType = ModelType.QWEN3_7_PLUS;

export const ResponseFormatType = {
  TEXT: 'text',
  MARKDOWN: 'markdown'
} as const;

export type ResponseFormatType = (typeof ResponseFormatType)[keyof typeof ResponseFormatType];
