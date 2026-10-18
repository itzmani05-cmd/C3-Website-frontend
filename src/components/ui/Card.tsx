import type { HTMLAttributes } from 'react';

export default function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-200/80 bg-white shadow-soft-sm transition-shadow duration-200 hover:shadow-soft-md',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
