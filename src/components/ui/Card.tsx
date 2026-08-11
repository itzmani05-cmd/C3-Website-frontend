import type { HTMLAttributes } from 'react';

export default function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-200 bg-white shadow-soft-sm',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
