'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-md bg-surface-alt animate-pulse', className)} />;
}

export function SkeletonCircle({ size = 10 }: { size?: number }) {
  const s = size;
  return <div className={cn('rounded-full bg-surface-alt animate-pulse', `h-${s} w-${s}`)} />;
}

export default Skeleton;
