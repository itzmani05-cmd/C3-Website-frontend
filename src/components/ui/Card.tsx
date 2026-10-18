import type { HTMLAttributes } from 'react';

export default function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'rounded-lg border border-slate-200 bg-white',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
