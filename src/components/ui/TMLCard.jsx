import React from 'react';
import { cn } from '@/lib/utils';

const TMLCard = React.forwardRef(({ 
  children, 
  variant = 'default',
  hover = false,
  className,
  ...props 
}, ref) => {
  
  const variants = {
    default: 'bg-white border border-gray-100',
    elevated: 'bg-white shadow-lg',
    cream: 'bg-[#faf8f5] border border-gray-100',
    gradient: 'bg-gradient-to-br from-[#7e277e] to-[#993333] text-white',
    outlined: 'bg-white border-2 border-[#7e277e]/20',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl p-6 transition-all duration-300',
        variants[variant],
        hover && 'hover:shadow-xl hover:-translate-y-1 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

TMLCard.displayName = 'TMLCard';

export const TMLCardHeader = ({ children, className, ...props }) => (
  <div className={cn('mb-4', className)} {...props}>
    {children}
  </div>
);

export const TMLCardTitle = ({ children, className, ...props }) => (
  <h3 className={cn('text-xl font-bold text-gray-900', className)} {...props}>
    {children}
  </h3>
);

export const TMLCardDescription = ({ children, className, ...props }) => (
  <p className={cn('text-gray-600 mt-1', className)} {...props}>
    {children}
  </p>
);

export const TMLCardContent = ({ children, className, ...props }) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);

export const TMLCardFooter = ({ children, className, ...props }) => (
  <div className={cn('mt-4 pt-4 border-t border-gray-100', className)} {...props}>
    {children}
  </div>
);

export default TMLCard;