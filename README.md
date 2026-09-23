# markdown-math-fmt

格式化 Markdown 中的数学代码。

数学代码包括由 `$...$` 隔开的内敛代码，也包括由 `$$...$$` 隔开的块代码。示例如下

- inline math

  ```markdown
  $\omega_X=\star X^\flat$
  ```

- block math

  ```markdown
  $$
  \mathrm{d}(F_x\partial_x + F_y\partial_y + F_z\partial_z)
  = F_x\mathrm{d}x + F_y\mathrm{d}y + F_z\mathrm{d}z
  $$
  ```

使用 tex-fmt 作为 LaTeX formatter，使用 remark-math 作为 Markdown math parser，本项目只进行简单包装。

项目同时导出 CLI Binary 和 VSCode Extension 便于直接使用。
