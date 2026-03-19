import React from 'react';
import { cn } from '@/lib/utils';

const TMLInput = React.forwardRef(function TMLInput(props, ref) {
  const { label, error, helperText, className, containerClassName, required, ...rest } = props;
  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      




      
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-3 rounded-lg border border-gray-200 bg-white',
          'placeholder:text-gray-400 text-gray-900',
          'focus:outline-none focus:ring-2 focus:ring-[#7e277e]/20 focus:border-[#7e277e]',
          'transition-all duration-200',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
          className
        )}
        {...rest} />
      
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="text-sm text-gray-500">{helperText}</p>}
    </div>);

});

TMLInput.displayName = 'TMLInput';

export default TMLInput;