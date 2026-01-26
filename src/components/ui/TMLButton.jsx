import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Taylor Made Law styled button component
const TMLButton = React.forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'default',
  loading = false,
  disabled = false,
  className,
  ...props 
}, ref) => {
  
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[#7e277e] hover:bg-[#5c1d5c] text-white shadow-lg hover:shadow-xl focus:ring-[#7e277e] rounded-full',
    secondary: 'bg-white hover:bg-gray-50 text-[#7e277e] border-2 border-[#7e277e] shadow-md hover:shadow-lg focus:ring-[#7e277e] rounded-full',
    accent: 'bg-[#a47864] hover:bg-[#7d5a4a] text-white shadow-lg hover:shadow-xl focus:ring-[#a47864] rounded-full',
    outline: 'bg-transparent hover:bg-[#7e277e]/10 text-[#7e277e] border-2 border-[#7e277e] focus:ring-[#7e277e] rounded-full',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-400 rounded-lg',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl focus:ring-red-600 rounded-full',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl focus:ring-emerald-600 rounded-full',
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    default: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
    icon: 'p-3',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

TMLButton.displayName = 'TMLButton';

export default TMLButton;