/**
 * 未配置部署覆盖时的正式目录，只在模型接口尚未返回时作占位。
 * 界面上的可选列表和默认模型以 GET /api/chat/models 为准。
 */
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
