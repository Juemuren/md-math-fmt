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
