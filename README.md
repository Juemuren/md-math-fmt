<!-- markdownlint-disable-file MD033 -->

# Markdown Math Formatter

格式化 Markdown 中的数学代码，包括用 `$...$` 隔开的行内代码和用 `$$...$$` 隔开的块级代码。

<table width="100%">

<tr>
  <th>格式化前</th>
  <th>格式化后</th>
</tr>

<tr>
<td>

```markdown
# 格式化示例

设 $ \Omega^k(M) $ 表示光滑流形 $ M $ 上的光滑 $ k $-形式空间。

外微分定义为一个线性映射

$$
  \mathrm{d}: \Omega^k(M) \longrightarrow \Omega^{k+1}(M)
$$

对 $ k $-形式外微分后得到 $ k+1 $-形式

$$
\begin{align}
\omega
&=\sum_I f_I \mathrm{d}x^I \\
\mathrm{d}\omega
&= \sum_I \mathrm{d}f_I \wedge \mathrm{d}x^I \\
\end{align}
$$
```

</td>
<td>

```markdown
# 格式化示例

设 $\Omega^k(M)$ 表示光滑流形 $M$ 上的光滑 $k$-形式空间。

外微分定义为一个线性映射

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
\end{align}
$$
```

</td>
</tr>

</table>

项目使用 [tex-fmt](https://github.com/WGUNDERWOOD/tex-fmt) 作为 LaTeX formatter，使用 [remark-math](https://github.com/remarkjs/remark-math) 作为 Markdown math parser。核心逻辑都由 tex-fmt 和 remark-math 完成，项目只进行简单包装。

项目提供 [`md-math-fmt` CLI](#cli) 和 [`Markdown Math Formatter` VS Code 扩展](#vs-code-扩展)。

## CLI

### 安装 CLI

目前仅支持从源码安装 CLI。

1. 安装项目依赖

    ```sh
    pnpm install
    ```

2. 生成用于安装的 tgz 文件

    ```sh
    pnpm package:cli
    ```

3. 全局安装 npm 包，将 `*` 替换为上一步生成的 tgz 文件中的对应部分

    ```sh
    npm install -g md-math-fmt-*.tgz
    ```

CLI 命令为 `md-math-fmt`。

CLI 为 JavaScript 构建产物，使用 CLI 需要本机已安装 Node.js 22 或更高版本。项目暂时不提供包含 Node.js runtime 在内的独立二进制。

格式化依赖 tex-fmt。CLI 不内置 tex-fmt，因此要求 PATH 中存在可用的 tex-fmt。

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

目前仅支持从源码安装 VS Code 扩展。

1. 安装项目依赖

    ```sh
    pnpm install
    ```

2. 生成用于安装的 vsix 文件

    ```sh
    pnpm package:extension
    ```

3. 安装 VS Code 扩展，将 `*` 替换为上一步生成的 vsix 文件中的对应部分

    ```sh
    code --install-extension md-math-fmt-*.vsix
    ```

    或者也可以在 VS Code 中运行命令 **Extensions: Install from VSIX...**，然后选择上一步生成的 vsix 文件

扩展名称为 `Markdown Math Formatter`。

格式化依赖 tex-fmt。VS Code 扩展不内置 tex-fmt，因此要求 PATH 中存在可用的 tex-fmt。可以在设置中指定 tex-fmt 的路径。

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
  "md-math-fmt.configPath": "tex-fmt.toml",
  "md-math-fmt.lineWidth": 80
}
```

- `md-math-fmt.texFmtPath` 用于指定 tex-fmt 二进制文件。
- `md-math-fmt.configPath` 用于指定 tex-fmt TOML 配置文件，相对路径以被格式化文档的目录为基准。
- `md-math-fmt.lineWidth` 用于指定行宽，会覆盖 tex-fmt 的配置。

缩进使用编辑器的 `tabSize` 和 `insertSpaces` 设置。

扩展仅在受信任的工作区运行；远程工作区需要在扩展运行的远程环境安装 tex-fmt。

## 行为与边界

### Markdown math 解析

Markdown math 解析由 remark-math 完成。

- 程序仅替换公式对应的源码片段，保留公式外的正文、代码跨度、围栏代码块、链接、换行符和 UTF-8 BOM。
- 支持列表和引用中的块级公式，保留分隔符及其元数据。
- 未闭合的块级公式和跨行的行内公式保持原样，避免改动未完成的输入或改变 TeX 注释语义。

### LaTeX 格式化

LaTeX 格式化规则由 tex-fmt 决定。

- 默认配置请参考 <https://github.com/WGUNDERWOOD/tex-fmt#configuration-file-options>。如果需要指定 tex-fmt 的配置文件，在 CLI 中使用参数 `--config`，在 VS Code 扩展中使用设置 `md-math-fmt.configPath`。
- tex-fmt 配置的 `wraplen` 可以被覆盖，在 CLI 中使用 `--line-width`，在 VSCode 扩展中使用 `md-math-fmt.lineWidth`。

## 程序接口

阅读 [程序接口文档](docs/api.md)

## 开发

阅读 [开发者文档](docs/developer.md)。
