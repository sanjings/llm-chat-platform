/**
 * 修改配置后重启编辑器
 * 配置项文档：https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */

export default {
  printWidth: 120, // 单行输出（不折行）的（最大）长度
  proseWrap: 'preserve', // 超出打印宽度 (always | never | preserve)
  tabWidth: 2, // 每个缩进级别的空格数
  useTabs: false, // 使用空格代替tab缩进
  semi: true, // 是否在语句末尾打印分号
  singleQuote: true, // 是否使用单引号
  quoteProps: 'as-needed', // 仅在需要时在对象属性周围添加引号
  jsxSingleQuote: false, // jsx 不使用单引号，而使用双引号
  trailingComma: 'none', // 去除对象最末尾元素跟随的逗号
  bracketSpacing: true, // 是否在对象属性添加空格
  bracketSameLine: false, // 标签放在最后一行的末尾，而不是单独放在下一行
  jsxBracketSameLine: false, // jsx标签放在最后一行的末尾，而不是单独放在下一行
  arrowParens: 'always', // 箭头函数只有一个参数的时候，需要括号
  insertPragma: false, // 在文件顶部插入一个特殊的@format标记，指定文件格式需要被格式化
  requirePragma: false, // 不需要写文件开头的 @prettier
  htmlWhitespaceSensitivity: 'ignore', // 指定 HTML 文件的全局空白区域敏感度
  vueIndentScriptAndStyle: true, // .vue script和style缩进
  endOfLine: 'auto' // 换行符
};