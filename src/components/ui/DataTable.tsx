import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

/** Bordered white panel holding a table; scrolls sideways on narrow screens. */
export function TablePanel({ children, toolbar, footer }: { children: ReactNode; toolbar?: ReactNode; footer?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {toolbar && <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-4">{toolbar}</div>}
      {/* relative: keeps absolutely positioned cell content (e.g. sr-only labels) inside the scroller. */}
      <div className="relative overflow-x-auto">{children}</div>
      {footer && <div className="border-t border-slate-200 px-3 sm:px-4">{footer}</div>}
    </div>
  );
}

export function Table({ children, minWidth = 640 }: { children: ReactNode; minWidth?: number }) {
  return (
    <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
      {children}
    </table>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50/80">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ className = '', children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={['h-9 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 first:pl-4 last:pr-4', className].join(' ')} {...rest}>
      {children}
    </th>
  );
}

export function Tr({ className = '', children, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={['border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70', className].join(' ')} {...rest}>
      {children}
    </tr>
  );
}

export function Td({ className = '', children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={['h-12 px-3 align-middle text-slate-700 first:pl-4 last:pr-4', className].join(' ')} {...rest}>
      {children}
    </td>
  );
}
