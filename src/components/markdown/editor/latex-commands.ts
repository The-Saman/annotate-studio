export interface LatexCommand {
  label: string;
  template?: string;
  detail: string;
  preview?: string;
  documentOnly?: boolean;
}

const greek = [
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta', 'theta', 'vartheta', 'iota', 'kappa',
  'lambda', 'mu', 'nu', 'xi', 'pi', 'varpi', 'rho', 'varrho', 'sigma', 'varsigma', 'tau', 'upsilon', 'phi',
  'varphi', 'chi', 'psi', 'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi',
  'Psi', 'Omega',
].map<LatexCommand>((name) => ({ label: `\\${name}`, detail: 'Greek letter', preview: `\\${name}` }));

const symbols: [string, string][] = [
  ['infty', 'infinity'], ['partial', 'partial derivative'], ['nabla', 'nabla'], ['hbar', 'reduced Planck constant'],
  ['ell', 'script l'], ['Re', 'real part'], ['Im', 'imaginary part'], ['aleph', 'aleph'], ['emptyset', 'empty set'],
  ['varnothing', 'empty set'], ['forall', 'for all'], ['exists', 'there exists'], ['nexists', 'there is no'],
  ['neg', 'not'], ['land', 'and'], ['lor', 'or'], ['therefore', 'therefore'], ['because', 'because'],
  ['angle', 'angle'], ['triangle', 'triangle'], ['square', 'square'], ['prime', 'prime'], ['circ', 'composition'],
  ['cdot', 'centered dot'], ['times', 'times'], ['div', 'divide'], ['pm', 'plus or minus'], ['mp', 'minus or plus'],
  ['ast', 'asterisk'], ['star', 'star'], ['bullet', 'bullet'], ['oplus', 'direct sum'], ['otimes', 'tensor product'],
  ['odot', 'circled dot'], ['cup', 'union'], ['cap', 'intersection'], ['setminus', 'set difference'],
  ['wedge', 'wedge'], ['vee', 'vee'], ['dots', 'dots'], ['cdots', 'centered dots'], ['ldots', 'low dots'],
  ['vdots', 'vertical dots'], ['ddots', 'diagonal dots'], ['leq', 'less or equal'], ['geq', 'greater or equal'],
  ['neq', 'not equal'], ['approx', 'approximately'], ['equiv', 'equivalent'], ['sim', 'similar'],
  ['simeq', 'similar or equal'], ['cong', 'congruent'], ['propto', 'proportional to'], ['ll', 'much less'],
  ['gg', 'much greater'], ['subset', 'subset'], ['supset', 'superset'], ['subseteq', 'subset or equal'],
  ['supseteq', 'superset or equal'], ['in', 'element of'], ['notin', 'not an element of'], ['ni', 'contains'],
  ['mid', 'divides'], ['parallel', 'parallel'], ['perp', 'perpendicular'], ['models', 'models'], ['vdash', 'proves'],
  ['to', 'to'], ['rightarrow', 'right arrow'], ['leftarrow', 'left arrow'], ['Rightarrow', 'implies'],
  ['Leftarrow', 'is implied by'], ['leftrightarrow', 'left-right arrow'], ['Leftrightarrow', 'if and only if'],
  ['mapsto', 'maps to'], ['implies', 'implies'], ['iff', 'if and only if'], ['longrightarrow', 'long right arrow'],
  ['Longrightarrow', 'long implies'], ['uparrow', 'up arrow'], ['downarrow', 'down arrow'],
  ['hookrightarrow', 'injection'], ['rightleftharpoons', 'equilibrium'], ['langle', 'left angle bracket'],
  ['rangle', 'right angle bracket'], ['lfloor', 'left floor'], ['rfloor', 'right floor'], ['lceil', 'left ceiling'],
  ['rceil', 'right ceiling'], ['quad', 'space'], ['qquad', 'wide space'], ['nonumber', 'no equation number'],
  ['displaystyle', 'display style'], ['limits', 'limits below and above'],
];

const functions = [
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'log', 'ln',
  'lg', 'exp', 'det', 'dim', 'ker', 'deg', 'gcd', 'arg', 'Pr', 'hom', 'max', 'min', 'sup', 'inf', 'limsup', 'liminf',
].map<LatexCommand>((name) => ({ label: `\\${name}`, detail: 'function', preview: `\\${name} x` }));

const structures: LatexCommand[] = [
  { label: '\\frac', template: '\\frac{${numerator}}{${denominator}}', detail: 'fraction', preview: '\\frac{a}{b}' },
  { label: '\\dfrac', template: '\\dfrac{${numerator}}{${denominator}}', detail: 'display fraction', preview: '\\dfrac{a}{b}' },
  { label: '\\tfrac', template: '\\tfrac{${numerator}}{${denominator}}', detail: 'text fraction', preview: '\\tfrac{a}{b}' },
  { label: '\\sqrt', template: '\\sqrt{${x}}', detail: 'square root', preview: '\\sqrt{x}' },
  { label: '\\sqrt[n]', template: '\\sqrt[${n}]{${x}}', detail: 'nth root', preview: '\\sqrt[n]{x}' },
  { label: '\\binom', template: '\\binom{${n}}{${k}}', detail: 'binomial', preview: '\\binom{n}{k}' },
  { label: '\\sum', template: '\\sum_{${i=1}}^{${n}}', detail: 'sum', preview: '\\sum_{i=1}^{n}' },
  { label: '\\prod', template: '\\prod_{${i=1}}^{${n}}', detail: 'product', preview: '\\prod_{i=1}^{n}' },
  { label: '\\int', template: '\\int_{${a}}^{${b}}', detail: 'integral', preview: '\\int_a^b' },
  { label: '\\iint', detail: 'double integral', preview: '\\iint' },
  { label: '\\iiint', detail: 'triple integral', preview: '\\iiint' },
  { label: '\\oint', detail: 'contour integral', preview: '\\oint' },
  { label: '\\lim', template: '\\lim_{${x} \\to ${a}}', detail: 'limit', preview: '\\lim_{x \\to a}' },
  { label: '\\bigcup', template: '\\bigcup_{${i}}', detail: 'big union', preview: '\\bigcup_i' },
  { label: '\\bigcap', template: '\\bigcap_{${i}}', detail: 'big intersection', preview: '\\bigcap_i' },
  { label: '\\left(', template: '\\left( ${} \\right)', detail: 'scaled parentheses', preview: '\\left( \\frac{a}{b} \\right)' },
  { label: '\\left[', template: '\\left[ ${} \\right]', detail: 'scaled brackets', preview: '\\left[ \\frac{a}{b} \\right]' },
  { label: '\\left\\{', template: '\\left\\\\{ ${} \\right\\\\}', detail: 'scaled braces', preview: '\\left\\{ \\frac{a}{b} \\right\\}' },
  { label: '\\left|', template: '\\left| ${} \\right|', detail: 'scaled bars', preview: '\\left| \\frac{a}{b} \\right|' },
  { label: '\\left.', template: '\\left. ${} \\right|_{${}}', detail: 'evaluated at', preview: '\\left. f \\right|_{x=0}' },
  { label: '\\vec', template: '\\vec{${v}}', detail: 'vector arrow', preview: '\\vec{v}' },
  { label: '\\hat', template: '\\hat{${x}}', detail: 'hat', preview: '\\hat{x}' },
  { label: '\\widehat', template: '\\widehat{${xy}}', detail: 'wide hat', preview: '\\widehat{xy}' },
  { label: '\\bar', template: '\\bar{${x}}', detail: 'bar', preview: '\\bar{x}' },
  { label: '\\overline', template: '\\overline{${x}}', detail: 'overline', preview: '\\overline{AB}' },
  { label: '\\underline', template: '\\underline{${x}}', detail: 'underline', preview: '\\underline{x}' },
  { label: '\\dot', template: '\\dot{${x}}', detail: 'time derivative', preview: '\\dot{x}' },
  { label: '\\ddot', template: '\\ddot{${x}}', detail: 'second time derivative', preview: '\\ddot{x}' },
  { label: '\\tilde', template: '\\tilde{${x}}', detail: 'tilde', preview: '\\tilde{x}' },
  { label: '\\overrightarrow', template: '\\overrightarrow{${AB}}', detail: 'vector over segment', preview: '\\overrightarrow{AB}' },
  { label: '\\overbrace', template: '\\overbrace{${x}}^{${label}}', detail: 'over brace', preview: '\\overbrace{a+b}^{n}' },
  { label: '\\underbrace', template: '\\underbrace{${x}}_{${label}}', detail: 'under brace', preview: '\\underbrace{a+b}_{n}' },
  { label: '\\boxed', template: '\\boxed{${x}}', detail: 'boxed', preview: '\\boxed{E=mc^2}' },
  { label: '\\text', template: '\\text{${text}}', detail: 'text in math', preview: '\\text{text}' },
  { label: '\\mathrm', template: '\\mathrm{${x}}', detail: 'upright', preview: '\\mathrm{d}x' },
  { label: '\\mathbf', template: '\\mathbf{${x}}', detail: 'bold', preview: '\\mathbf{F}' },
  { label: '\\boldsymbol', template: '\\boldsymbol{${x}}', detail: 'bold symbol', preview: '\\boldsymbol{\\omega}' },
  { label: '\\mathbb', template: '\\mathbb{${R}}', detail: 'blackboard bold', preview: '\\mathbb{R}' },
  { label: '\\mathcal', template: '\\mathcal{${L}}', detail: 'calligraphic', preview: '\\mathcal{L}' },
  { label: '\\mathfrak', template: '\\mathfrak{${g}}', detail: 'fraktur', preview: '\\mathfrak{g}' },
  { label: '\\mathit', template: '\\mathit{${x}}', detail: 'italic', preview: '\\mathit{diff}' },
  { label: '\\mathsf', template: '\\mathsf{${x}}', detail: 'sans serif', preview: '\\mathsf{A}' },
  { label: '\\operatorname', template: '\\operatorname{${name}}', detail: 'operator name', preview: '\\operatorname{rank} A' },
  { label: '\\xrightarrow', template: '\\xrightarrow{${label}}', detail: 'labelled arrow', preview: '\\xrightarrow{f}' },
  { label: '\\ce', template: '\\ce{${H2O}}', detail: 'chemical formula', preview: '\\ce{2H2 + O2 -> 2H2O}' },
  { label: '\\pu', template: '\\pu{${1.2 kJ/mol}}', detail: 'physical unit', preview: '\\pu{1.2 kJ/mol}' },
  { label: '\\tag', template: '\\tag{${1}}', detail: 'equation tag', preview: 'x \\tag{1}' },
  { label: '\\label', template: '\\label{${eq:}}', detail: 'label for references' },
  { label: '\\eqref', template: '\\eqref{${eq:}}', detail: 'equation reference' },
  { label: '\\ref', template: '\\ref{${label}}', detail: 'reference' },
  { label: '\\newcommand', template: '\\newcommand{\\${name}}{${definition}}', detail: 'define a macro' },
  { label: '\\DeclareMathOperator', template: '\\DeclareMathOperator{\\${name}}{${text}}', detail: 'define an operator' },
];

const documentCommands: LatexCommand[] = [
  { label: '\\section', template: '\\section{${title}}', detail: 'section', documentOnly: true },
  { label: '\\subsection', template: '\\subsection{${title}}', detail: 'subsection', documentOnly: true },
  { label: '\\subsubsection', template: '\\subsubsection{${title}}', detail: 'subsubsection', documentOnly: true },
  { label: '\\paragraph', template: '\\paragraph{${title}}', detail: 'paragraph heading', documentOnly: true },
  { label: '\\textbf', template: '\\textbf{${text}}', detail: 'bold text', documentOnly: true },
  { label: '\\textit', template: '\\textit{${text}}', detail: 'italic text', documentOnly: true },
  { label: '\\emph', template: '\\emph{${text}}', detail: 'emphasis', documentOnly: true },
  { label: '\\texttt', template: '\\texttt{${text}}', detail: 'monospace text', documentOnly: true },
  { label: '\\item', template: '\\item ${}', detail: 'list item', documentOnly: true },
  { label: '\\cite', template: '\\cite{${key}}', detail: 'citation', documentOnly: true },
  { label: '\\footnote', template: '\\footnote{${text}}', detail: 'footnote', documentOnly: true },
  { label: '\\href', template: '\\href{${url}}{${text}}', detail: 'link', documentOnly: true },
  { label: '\\url', template: '\\url{${url}}', detail: 'url', documentOnly: true },
  { label: '\\includegraphics', template: '\\includegraphics[width=${0.8}\\linewidth]{${file}}', detail: 'image', documentOnly: true },
  { label: '\\caption', template: '\\caption{${text}}', detail: 'caption', documentOnly: true },
  { label: '\\documentclass', template: '\\documentclass{${article}}', detail: 'document class', documentOnly: true },
  { label: '\\usepackage', template: '\\usepackage{${package}}', detail: 'package', documentOnly: true },
  { label: '\\title', template: '\\title{${title}}', detail: 'title', documentOnly: true },
  { label: '\\author', template: '\\author{${name}}', detail: 'author', documentOnly: true },
  { label: '\\date', template: '\\date{${\\today}}', detail: 'date', documentOnly: true },
  { label: '\\maketitle', detail: 'print the title', documentOnly: true },
  { label: '\\tableofcontents', detail: 'table of contents', documentOnly: true },
  { label: '\\lr', template: '\\lr{${text}}', detail: 'left-to-right text (xepersian)', documentOnly: true },
  { label: '\\rl', template: '\\rl{${text}}', detail: 'right-to-left text (xepersian)', documentOnly: true },
];

export const LATEX_COMMANDS: LatexCommand[] = [
  ...structures,
  ...greek,
  ...symbols.map<LatexCommand>(([name, detail]) => ({ label: `\\${name}`, detail, preview: `\\${name}` })),
  ...functions,
  ...documentCommands,
];

export interface LatexEnvironment {
  name: string;
  detail: string;
  math: boolean;
  body?: string;
}

export const LATEX_ENVIRONMENTS: LatexEnvironment[] = [
  { name: 'equation', detail: 'numbered equation', math: false },
  { name: 'equation*', detail: 'unnumbered equation', math: false },
  { name: 'align', detail: 'aligned equations', math: false, body: '${a} &= ${b} \\\\\n  ${c} &= ${d}' },
  { name: 'align*', detail: 'aligned equations, unnumbered', math: false, body: '${a} &= ${b} \\\\\n  ${c} &= ${d}' },
  { name: 'gather', detail: 'centered equations', math: false },
  { name: 'cases', detail: 'piecewise cases', math: true, body: '${a} & ${x > 0} \\\\\n  ${b} & ${x \\le 0}' },
  { name: 'aligned', detail: 'aligned block', math: true, body: '${a} &= ${b} \\\\\n  ${c} &= ${d}' },
  { name: 'matrix', detail: 'matrix', math: true, body: '${a} & ${b} \\\\\n  ${c} & ${d}' },
  { name: 'pmatrix', detail: 'matrix in parentheses', math: true, body: '${a} & ${b} \\\\\n  ${c} & ${d}' },
  { name: 'bmatrix', detail: 'matrix in brackets', math: true, body: '${a} & ${b} \\\\\n  ${c} & ${d}' },
  { name: 'vmatrix', detail: 'determinant', math: true, body: '${a} & ${b} \\\\\n  ${c} & ${d}' },
  { name: 'array', detail: 'array', math: true },
  { name: 'theorem', detail: 'theorem', math: false },
  { name: 'lemma', detail: 'lemma', math: false },
  { name: 'definition', detail: 'definition', math: false },
  { name: 'proof', detail: 'proof', math: false },
  { name: 'example', detail: 'example', math: false },
  { name: 'corollary', detail: 'corollary', math: false },
  { name: 'proposition', detail: 'proposition', math: false },
  { name: 'remark', detail: 'remark', math: false },
  { name: 'exercise', detail: 'exercise', math: false },
  { name: 'solution', detail: 'solution', math: false },
  { name: 'itemize', detail: 'bulleted list', math: false, body: '\\item ${}' },
  { name: 'enumerate', detail: 'numbered list', math: false, body: '\\item ${}' },
  { name: 'description', detail: 'description list', math: false, body: '\\item[${term}] ${}' },
  { name: 'figure', detail: 'figure', math: false, body: '\\centering\n  \\includegraphics[width=0.8\\linewidth]{${file}}\n  \\caption{${caption}}' },
  { name: 'table', detail: 'table float', math: false },
  { name: 'tabular', detail: 'table', math: false, body: '${a} & ${b} \\\\\n  ${c} & ${d}' },
  { name: 'center', detail: 'centered', math: false },
  { name: 'quote', detail: 'quotation', math: false },
  { name: 'abstract', detail: 'abstract', math: false },
  { name: 'verbatim', detail: 'verbatim', math: false },
  { name: 'document', detail: 'document body', math: false },
];
