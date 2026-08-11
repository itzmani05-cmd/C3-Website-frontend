import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const CONTROL_CLASSES =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-slate-50';

interface FieldWrapperProps {
  label?: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

function FieldWrapper({ label, htmlFor, error, children, className = '' }: FieldWrapperProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {error && <p className="mt-1.5 text-xs text-danger-600">{error}</p>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, wrapperClassName, leadingIcon, className = '', ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} error={error} className={wrapperClassName}>
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[CONTROL_CLASSES, leadingIcon ? 'pl-10' : '', className].join(' ')}
          {...rest}
        />
      </div>
    </FieldWrapper>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, wrapperClassName, className = '', ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} error={error} className={wrapperClassName}>
      <textarea ref={ref} id={inputId} className={[CONTROL_CLASSES, 'resize-y', className].join(' ')} {...rest} />
    </FieldWrapper>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, wrapperClassName, className = '', children, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} error={error} className={wrapperClassName}>
      <select ref={ref} id={inputId} className={[CONTROL_CLASSES, 'cursor-pointer', className].join(' ')} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  );
});
