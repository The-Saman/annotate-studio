'use client';

import React from 'react';
import { baseName } from '@/lib/utils';

export default function FileLabel({ path, className }: { path: string; className?: string }) {
  const name = baseName(path);
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : '';
  return (
    <span className={className ? `file-label ${className}` : 'file-label'} title={path}>
      <bdi>{stem}</bdi>
      {extension && <span className="file-label-ext">{extension}</span>}
    </span>
  );
}
