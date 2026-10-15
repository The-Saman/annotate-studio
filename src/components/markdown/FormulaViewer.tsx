'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Minus, Plus, X } from 'lucide-react';
import { renderMath } from '@/lib/math-render';
import { copyText } from '@/lib/utils';
import { useFormula } from '@/store/formula';

const STEPS = [1.5, 2, 2.5, 3, 4, 5, 6];

export default function FormulaViewer() {
  const current = useFormula((state) => state.current);
  const close = useFormula((state) => state.close);
  const [step, setStep] = useState(2);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!current) return;
    setStep(2);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === '+' || event.key === '=') {
        setStep((value) => Math.min(STEPS.length - 1, value + 1));
      } else if (event.key === '-') {
        setStep((value) => Math.max(0, value - 1));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [current, close]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const rendered = useMemo(
    () => (current ? renderMath(current.latex, true, current.macros, current.macrosKey) : null),
    [current],
  );

  if (!current || !rendered) return null;

  return (
    <div className="dialog-overlay formula-overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div
        className="formula-viewer"
        role="dialog"
        aria-label="Formula"
        onWheel={(event) => {
          if (!event.ctrlKey && !event.metaKey) return;
          event.preventDefault();
          setStep((value) => Math.max(0, Math.min(STEPS.length - 1, value + (event.deltaY < 0 ? 1 : -1))));
        }}
      >
        <div className="formula-viewer-toolbar">
          <button type="button" className="icon-btn" onClick={() => setStep((value) => Math.max(0, value - 1))} title="Smaller (-)">
            <Minus size={15} />
          </button>
          <span className="formula-viewer-scale">{Math.round(STEPS[step] * 100)}%</span>
          <button type="button" className="icon-btn" onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))} title="Larger (+)">
            <Plus size={15} />
          </button>
          <div className="formula-viewer-spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copyText(current.source ?? current.latex).then(setCopied)}>
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy LaTeX'}
          </button>
          <button type="button" className="icon-btn" onClick={close} title="Close (Esc)">
            <X size={15} />
          </button>
        </div>
        <div className="formula-viewer-body" dir="ltr">
          <div style={{ fontSize: `${STEPS[step]}em` }} dangerouslySetInnerHTML={{ __html: rendered.html }} />
        </div>
        {rendered.error && <div className="formula-viewer-error">{rendered.error}</div>}
        <pre className="formula-viewer-source" dir="ltr">
          {current.source ?? current.latex}
        </pre>
      </div>
    </div>
  );
}
