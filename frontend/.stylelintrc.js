export default {
  root: true,
  // 继承某些已有的规则
  extends: ['stylelint-config-recommended-scss', 'stylelint-config-recess-order', 'stylelint-prettier/recommended'],
  overrides: [
    {
      files: ['**/*.{jsx,tsx,html}'],
      customSyntax: 'postcss-html'
    },
    {
      files: ['**/*.{css,scss}'],
      customSyntax: 'postcss-scss'
    }
  ],
  defaultSeverity: 'warning',
  // 自定义规则
  rules: {
    'color-hex-length': 'long', // 十六进制颜色不使用缩写
    'value-keyword-case': null, // 解决在 scss 中使用 v-bind 大写单词报错
    'import-notation': 'string', // 指定导入CSS文件的方式("string"|"url")
    'selector-class-pattern': null, // 选择器类名命名规则
    'custom-property-pattern': null, // 自定义属性命名规则
    'keyframes-name-pattern': null, // 动画帧节点样式命名规则
    'no-descending-specificity': null, // 允许无降序特异性
    'no-empty-source': null, // 允许空样式
    // 允许 global 、export 、deep伪类
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['global', 'export', 'deep']
      }
    ],
    // 允许未知属性
    'property-no-unknown': [
      true,
      {
        ignoreProperties: []
      }
    ],
    // 允许未知规则
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['apply', 'use', 'forward', 'mixin', 'include', 'if', 'else']
      }
    ]
  },
  ignoreFiles: ['**/*.js', '**/*.jsx', '**/*.tsx', '**/*.ts']
};
