import React from 'react';
import { cn } from '@/lib/utils';

const TMLBadge = ({ 
  children, 
  variant = 'default',
  size = 'default',
  className,
  ...props 
}) => {
  
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-[#7e277e]/10 text-[#7e277e]',
    accent: 'bg-[#a47864]/10 text-[#a47864]',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    trending: 'bg-gradient-to-r from-[#7e277e] to-[#993333] text-white',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default TMLBadge;