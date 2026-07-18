import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ children, className, ...props }) {
  return (
    <div className={cn('bg-white rounded-2xl shadow-md border border-gray-100', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return <div className={cn('p-6 pb-0', className)}>{children}</div>;
}

export function CardTitle({ children, className }) {
  return <h3 className={cn('text-lg font-bold text-gray-800', className)}>{children}</h3>;
}

export function CardContent({ children, className }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}
