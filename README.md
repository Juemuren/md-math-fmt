# Markdown Math Formatter

格式化 Markdown 中的数学代码。

数学代码包括由 `$...$` 隔开的行内代码，也包括由 `$$...$$` 隔开的块级代码。示例如下

- 行内数学代码

  ```markdown
  $\omega_X=\star X^\flat$
  ```

- 块级数学代码

  ```markdown
  $$
  \mathrm{d}(F_x\partial_x + F_y\partial_y + F_z\partial_z)
  = F_x\mathrm{d}x + F_y\mathrm{d}y + F_z\mathrm{d}z
  $$
  ```

项目使用 [tex-fmt](https://github.com/WGUNDERWOOD/tex-fmt) 作为 LaTeX formatter，使用 [remark-math](https://github.com/remarkjs/remark-math) 作为 Markdown math parser。核心逻辑都由 tex-fmt 和 remark-math 完成，项目只进行简单包装。

项目提供 `md-math-fmt` CLI 和 `Markdown Math Formatter` VS Code 扩展。当前 CLI 为 JavaScript 构建产物，运行时需要 Node.js 以及可从 PATH 调用的 tex-fmt；项目不内置 tex-fmt，且尚未提供独立二进制。

## 构建

需要 Node.js 22 或更高版本、pnpm 12。

```sh
pnpm install
pnpm build
```

构建结果位于 `dist/`，包含 CLI、可导入的格式化 API 和 VS Code 扩展。

## 打包

CLI 和 VS Code 扩展需要分别打包；打包前会自动进行对应的构建。

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

    或者也可以在 VS Code 中运行命令 **Extensions: Install from VSIX...**，然后选择生成的 `md-math-fmt-*.vsix`。

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

```js
import { formatMarkdown } from 'md-math-fmt';

const output = await formatMarkdown(input, {
  texFmtPath: 'tex-fmt',
  lineWidth: 80,
});
```

也可调用 `formatMathEdits` 获得 `{ start, end, text }` 编辑列表，偏移量为 UTF-16 字符偏移。

两种接口均支持 `configPath`、`cwd`、`tabSize`、`useTabs`、`timeoutMs` 和 `signal`。

单个公式的默认进程超时为 10 秒，格式化失败会抛出带公式行号的错误。

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
