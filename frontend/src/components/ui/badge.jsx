import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-medical-100 text-medical-700',
  secondary: 'bg-gray-100 text-gray-600',
  outline: 'bg-transparent border border-gray-300 text-gray-600',
  success: 'bg-green-100 text-green-700',
  danger: 'bg-red-100 text-red-700',
};

export default function Badge({ children, variant = 'default', className }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
