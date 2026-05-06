# KaTeX Math Test

This document tests KaTeX math formula rendering in Yank Note.

## Inline Math

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.

Einstein's equation: $E = mc^2$.

Simple expression: $a^2 + b^2 = c^2$.

Greek letters: $\alpha$, $\beta$, $\gamma$, $\delta$, $\epsilon$, $\theta$, $\lambda$, $\mu$, $\pi$, $\sigma$, $\omega$.

## Block Math

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

$$
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$

$$
f(x) = \begin{cases}
  x^2 & \text{if } x \geq 0 \\
  -x^2 & \text{if } x < 0
\end{cases}
$$

## Matrix

$$
A = \begin{pmatrix}
  a_{11} & a_{12} & a_{13} \\
  a_{21} & a_{22} & a_{23} \\
  a_{31} & a_{32} & a_{33}
\end{pmatrix}
$$

$$
\begin{bmatrix}
  1 & 0 & 0 \\
  0 & 1 & 0 \\
  0 & 0 & 1
\end{bmatrix}
$$

## Aligned Equations

$$
\begin{aligned}
  a &= b + c \\
  d &= e + f + g \\
  h &= i + j + k + l
\end{aligned}
$$

## Fractions and Binomials

$$
\frac{n!}{k!(n-k)!} = \binom{n}{k}
$$

## Limits and Calculus

$$
\lim_{x \to 0} \frac{\sin x}{x} = 1
$$

$$
\frac{d}{dx}\left( \int_{a}^{x} f(t)\,dt \right) = f(x)
$$

## Chemical Equations (mhchem)

$\ce{H2O}$

$\ce{CO2 + H2O -> H2CO3}$

$\ce{2H2 + O2 ->[\text{combustion}] 2H2O}$

$\ce{Fe^{2+} + 2OH^{-} -> Fe(OH)2 v}$

## Trigonometric Functions

$$
\sin^2\theta + \cos^2\theta = 1
$$

$$
e^{i\pi} + 1 = 0
$$

## Summation and Product

$$
\prod_{i=1}^{n} x_i = x_1 \cdot x_2 \cdots x_n
$$

$$
\sum_{k=0}^{\infty} \frac{x^k}{k!} = e^x
$$

## Set Notation

$$
A \cup B = \{x : x \in A \text{ or } x \in B\}
$$

$$
A \cap B = \{x : x \in A \text{ and } x \in B\}
$$

$$
\forall x \in \mathbb{R}, \exists y \in \mathbb{R} : x + y = 0
$$
