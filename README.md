<!-- markdownlint-disable-file MD033 -->

# Markdown Math Formatter

格式化 Markdown 中的数学代码。

数学代码包括由 `$...$` 隔开的行内代码，也包括由 `$$...$$` 隔开的块级代码。

<table width="100%">

<tr>
  <th>格式化前</th>
  <th>格式化后</th>
</tr>

<tr>
<td>

```markdown
# 格式化示例

设 $ \Omega^k(M) $ 表示光滑流形 $ M $ 上的光滑 $ k $-形式空间。外微分定义为线性映射

$$
  \mathrm{d}: \Omega^k(M) \longrightarrow \Omega^{k+1}(M)
$$

对 $k$-形式外微分后得到 $k+1$-形式

$$
\begin{align}
\omega
&=\sum_I f_I \mathrm{d}x^I \\
\mathrm{d}\omega
&= \sum_I \mathrm{d}f_I \wedge \mathrm{d}x^I \\
\mathrm{d}\omega
&= \sum_I \sum_j \frac{\partial f_I}{\partial x^j} \mathrm{d}x^j \wedge \mathrm{d}x^I
\end{align}
$$
```

</td>
<td>

```markdown
# 格式化示例

设 $\Omega^k(M)$ 表示光滑流形 $M$ 上的光滑 $k$-形式空间。外微分定义为线性映射

$$
\mathrm{d}: \Omega^k(M) \longrightarrow \Omega^{k+1}(M)
$$

对 $k$-形式外微分后得到 $k+1$-形式

$$
\begin{align}
  \omega
  &=\sum_I f_I \mathrm{d}x^I \\
  \mathrm{d}\omega
  &= \sum_I \mathrm{d}f_I \wedge \mathrm{d}x^I \\
  \mathrm{d}\omega
  &= \sum_I \sum_j \frac{\partial f_I}{\partial x^j} \mathrm{d}x^j
  \wedge \mathrm{d}x^I
\end{align}
$$
```

</td>
</tr>

</table>

项目使用 [tex-fmt](https://github.com/WGUNDERWOOD/tex-fmt) 作为 LaTeX formatter，使用 [remark-math](https://github.com/remarkjs/remark-math) 作为 Markdown math parser。核心逻辑都由 tex-fmt 和 remark-math 完成，项目只进行简单包装。

项目提供 `md-math-fmt` CLI 和 `Markdown Math Formatter` VS Code 扩展。当前 CLI 为 JavaScript 构建产物，运行时需要本机已安装 Node.js （22 或更高版本）和 tex-fmt；项目不内置 tex-fmt，也不提供包含 Node.js runtime 在内的独立二进制。

## 构建

包管理器为 pnpm。

```sh
pnpm install
pnpm build
```

构建结果位于 `dist/`，包含 CLI、可导入的 API 和 VS Code 扩展。

## 打包

CLI 和 VS Code 扩展需要分别打包；打包前会自动运行对应的构建。

```sh
# 构建 CLI 并生成 md-math-fmt-*.tgz
pnpm package:cli

# 构建扩展并生成 md-math-fmt-*.vsix
pnpm package:extension
```

## CLI

### 安装 CLI

1. 生成 tgz 文件

    ```sh
    pnpm package:cli
    ```

2. 全局安装 npm 包，将 `*` 替换为 tgz 文件中的版本号

    ```sh
    npm install -g md-math-fmt-*.tgz
    ```

CLI 命令为 `md-math-fmt`。

### 使用 CLI

```sh
# 格式化结果输出到标准输出，不修改原文件
md-math-fmt notes.md

# 原地修改一个或多个文件
md-math-fmt --write notes.md chapter.md

# 仅检查格式，适合 CI
md-math-fmt --check notes.md

# 从标准输入读取
md-math-fmt < notes.md

# 指定 tex-fmt 和配置文件
md-math-fmt --tex-fmt /path/to/tex-fmt --config tex-fmt.toml notes.md
```

参数说明：

- `-h` / `--help` 查看帮助
- `-v` / `--version` 查看版本
- `--line-width <n>` 设置块级公式换行宽度，行内公式禁用自动折行
- 缺少 `--config` 时禁止 tex-fmt 的配置文件寻找
- `--write` 和 `--check` 不能同时使用
- 多个输入文件无法输出到标准输出，必须选择 `--write` 和 `--check` 中的一种模式。写入前会先完成全部文件的格式化，任一文件读取或格式化失败则不会写入该批文件。

退出码：

- `0` 表示成功
- `1` 表示参数、文件或格式化错误
- `2` 表示 `--check` 发现需要格式化

## VS Code 扩展

### 安装 VS Code 扩展

1. 生成 vsix 文件

    ```sh
    pnpm package:extension
    ```

2. 安装 VS Code 扩展，将 `*` 替换为 vsix 文件中的版本号

    ```sh
    code --install-extension md-math-fmt-*.vsix
    ```

    或者也可以在 VS Code 中运行命令 **Extensions: Install from VSIX...**，然后选择生成的 `md-math-fmt-*.vsix` 文件

扩展名称为 `Markdown Math Formatter`。

### 使用 VS Code 扩展

打开 Markdown 文件，运行 **Format Document...**，然后选择 **Markdown Math Formatter**。

也可以配置默认格式化器和保存时格式化：

```json
{
  "[markdown]": {
    "editor.defaultFormatter": "md-math-fmt.md-math-fmt",
    "editor.formatOnSave": true
  },
  "md-math-fmt.texFmtPath": "tex-fmt",
  "md-math-fmt.lineWidth": 80
}
```

`md-math-fmt.configPath` 可指定 tex-fmt TOML 配置文件，相对路径以当前文档目录为基准。

缩进使用编辑器的 `tabSize` 和 `insertSpaces` 设置。扩展仅在受信任的工作区运行；
远程工作区需要在扩展运行的远程环境安装 tex-fmt。

## 程序接口

项目以 ESM 形式导出 `formatMarkdown` 和 `formatMathEdits` 两个函数。项目被作为依赖安装后，可以在 JavaScript / TypeScript 中调用这些接口。

### formatMarkdown

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

### formatMathEdits

只返回需要修改的位置和替换内容，适合需要自行应用修改的场景；没有变化时返回空数组。

```js
import { formatMathEdits } from 'md-math-fmt';

const edits = await formatMathEdits('公式：$ x $');
console.log(edits);
// [{ start: 3, end: 8, text: '$x$' }]
```

`start` 和 `end` 是原文中的 UTF-16 偏移量，对应 `source.slice(start, end)` 的范围。多项修改应从后向前应用。

### 格式化选项

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

## 行为与边界

### Markdown math 解析

Markdown math 解析由 remark-math 完成。

- 程序仅替换公式对应的源码片段，保留公式外的正文、代码跨度、围栏代码块、链接、换行符和 UTF-8 BOM。
- 支持列表和引用中的块级公式，保留分隔符及其元数据。
- 未闭合的块级公式和跨行的行内公式保持原样，避免改动未完成的输入或改变 TeX 注释语义。

### LaTeX 格式化

LaTeX 格式化规则由 tex-fmt 决定。

- 默认配置请参考 <https://github.com/WGUNDERWOOD/tex-fmt#configuration-file-options>，程序提供参数 `--config` 用于指定 tex-fmt 的配置文件。
- 可以使用 `--line-width` 覆盖 tex-fmt 的 `wraplen` 配置。

## 验证

### 静态检查和格式化

项目使用 Biome 检查和格式化 TypeScript、JavaScript 和 JSON

```sh
pnpm check
```

### 类型检查

项目使用 TypeScript 进行类型检查

```sh
pnpm typecheck
```

### 测试

项目使用 Node.js 内置的测试模块进行测试

```sh
pnpm test
```

测试覆盖核心格式化、CLI 和扩展接口。

- 真实 tex-fmt 集成测试在未安装 tex-fmt 时会跳过，完整验证前请确保 `tex-fmt --version` 可执行。当前集成测试使用 tex-fmt 0.5.7。
- 扩展接口测试使用 VS Code API 替身，无法替代在 VS Code 扩展宿主中的手动验证。
