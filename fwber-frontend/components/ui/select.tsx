'use client';

import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = { value: string; label: React.ReactNode };

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: React.ReactNode;
  options: Option[];
  registerOption: (option: Option) => () => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(component: string) {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error(`${component} must be used inside <Select>.`);
  }

  return context;
}

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  const [options, setOptions] = React.useState<Option[]>([]);
  const [placeholder, setPlaceholder] = React.useState<React.ReactNode>('Select an option');

  const registerOption = React.useCallback((option: Option) => {
    setOptions((current) => {
      if (current.some((entry) => entry.value === option.value)) {
        return current.map((entry) => (entry.value === option.value ? option : entry));
      }

      return [...current, option];
    });

    return () => {
      setOptions((current) => current.filter((entry) => entry.value !== option.value));
    };
  }, []);

  const contextValue = React.useMemo<SelectContextValue>(
    () => ({ value, onValueChange, placeholder, options, registerOption }),
    [onValueChange, options, placeholder, registerOption, value],
  );

  return <SelectContext.Provider value={contextValue}>{children}</SelectContext.Provider>;
}

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }
>(({ className, children, ...props }, ref) => {
  const { value, onValueChange, options, placeholder } = useSelectContext('SelectTrigger');
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <select
        className={cn(
          'flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        value={value ?? ''}
        onChange={(event) => onValueChange?.(event.target.value)}
        aria-label={typeof selectedOption?.label === 'string' ? selectedOption.label : 'Select option'}
      >
        {!value ? <option value="">{typeof placeholder === 'string' ? placeholder : 'Select an option'}</option> : null}
        {(options || []).map((option) => (
          <option key={option.value} value={option.value}>
            {typeof option.label === 'string' ? option.label : option.value}
          </option>
        ))}
      </select>
      <button
        ref={ref}
        type="button"
        className="pointer-events-none absolute inset-y-0 right-0 inline-flex items-center pr-3 text-muted-foreground"
        tabIndex={-1}
        {...props}
      >
        {children ?? <ChevronDown className="h-4 w-4" />}
      </button>
    </div>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

export function SelectValue({ placeholder }: { placeholder?: React.ReactNode }) {
  const context = useSelectContext('SelectValue');

  React.useEffect(() => {
    if (placeholder !== undefined) {
      (context as any).placeholder = placeholder;
    }
  }, [context, placeholder]);

  return <span className="sr-only">{typeof placeholder === 'string' ? placeholder : 'Select value'}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const { registerOption } = useSelectContext('SelectItem');

  React.useEffect(() => registerOption({ value, label: children }), [children, registerOption, value]);

  return (
    <span className="hidden" data-value={value}>
      <Check className="mr-2 h-4 w-4" />
      {children}
    </span>
  );
}
