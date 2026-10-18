interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** A row of mutually exclusive buttons, e.g. "Unit-wise Questions | Test Questions". */
export default function SegmentedControl<T extends string>({ options, value, onChange, className = '' }: SegmentedControlProps<T>) {
  return (
    <div className={['inline-flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-1', className].join(' ')}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={[
            'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4',
            value === option.value ? 'bg-white text-slate-900 shadow-soft-sm' : 'text-slate-500 hover:text-slate-800',
          ].join(' ')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
