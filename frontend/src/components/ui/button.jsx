import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  primary: 'bg-medical-600 text-white hover:bg-medical-700 shadow-lg shadow-medical-200',
  secondary: 'bg-white text-medical-700 border border-medical-200 hover:bg-medical-50',
  outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

export default function Button({ children, variant = 'primary', size = 'md', className, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
