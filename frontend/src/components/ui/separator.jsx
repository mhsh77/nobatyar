import React from 'react';
import { cn } from '../../lib/utils';

export default function Separator({ className, orientation = 'horizontal' }) {
  return (
    <div
      className={cn(
        'bg-gray-200',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className
      )}
    />
  );
}
