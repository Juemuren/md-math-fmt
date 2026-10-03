# 程序接口

项目以 ESM 形式导出 `formatMarkdown` 和 `formatMathEdits` 两个函数。项目被作为依赖安装后，可以在 JavaScript / TypeScript 中调用这些接口。

## formatMarkdown

传入 Markdown 字符串，返回格式化后的全文。

```js
import { formatMarkdown } from 'md-math-fmt';

const input = '行内公式：$ x $';
const output = await formatMarkdown(input, {
  texFmtPath: 'tex-fmt',
  lineWidth: 80,
});

console.log(output);
// 行内公式：$x$
```

## formatMathEdits

只返回需要修改的位置和替换内容，适合需要自行应用修改的场景；没有变化时返回空数组。

```js
import { formatMathEdits } from 'md-math-fmt';

const edits = await formatMathEdits('公式：$ x $');
console.log(edits);
// [{ start: 3, end: 8, text: '$x$' }]
```

`start` 和 `end` 是原文中的 UTF-16 偏移量，对应 `source.slice(start, end)` 的范围。多项修改应从后向前应用。

## 格式化选项

两个接口都可以通过第二个参数设置格式化选项，常用选项如下：

| 选项 | 说明 |
| --- | --- |
| `texFmtPath` | tex-fmt 可执行文件路径，默认为 `'tex-fmt'` |
| `configPath` | tex-fmt 配置文件路径，省略时不查找配置文件 |
| `lineWidth` | 块级公式的换行宽度，行内公式不自动折行 |
| `tabSize` | 缩进宽度 |
| `useTabs` | 设为 `true` 时使用制表符缩进 |
| `cwd` | 工作目录 |
| `timeoutMs` | 单个公式的超时毫秒数，默认 `10000` |
| `signal` | 取消操作 |

格式化失败时可用 `try...catch` 捕获错误，错误信息会包含出错公式的行号。
