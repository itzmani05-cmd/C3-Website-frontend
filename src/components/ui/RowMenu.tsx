import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, MoreVertical } from 'lucide-react';

export interface RowMenuItem {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

const MENU_WIDTH = 184;

/**
 * The "⋯" actions menu at the end of a table row. The menu is rendered in a portal with fixed
 * positioning so a table's scroll container can't clip it; it flips upward near the bottom edge.
 */
interface RowMenuProps {
  items: RowMenuItem[];
  label?: string;
  /** Vertical dots instead of horizontal ones. */
  vertical?: boolean;
  /** Replaces the default small, borderless trigger styling (e.g. to match a neighbouring bordered button). */
  buttonClassName?: string;
}

export default function RowMenu({ items, label = 'Actions', vertical = false, buttonClassName }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const visible = items.filter((item) => !item.hidden);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? visible.length * 32 + 8;
    const below = rect.bottom + 4;
    const top = below + menuHeight > window.innerHeight - 8 ? Math.max(8, rect.top - menuHeight - 4) : below;
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    setPosition({ top, left });
  }, [open, visible.length]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    // The menu is fixed-position, so close it rather than let it drift when the page scrolls.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setPosition(null);
          setOpen((v) => !v);
        }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClassName ?? 'inline-flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900'}
      >
        {vertical ? <MoreVertical className="size-4" /> : <MoreHorizontal className="size-4" />}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: position?.top ?? -9999, left: position?.left ?? -9999, width: MENU_WIDTH }}
            className="z-50 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-soft-lg"
          >
            {visible.map(({ label: itemLabel, icon: Icon, onSelect, danger }) => (
              <button
                key={itemLabel}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSelect();
                }}
                className={[
                  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] font-medium transition-colors',
                  danger ? 'text-danger-600 hover:bg-danger-50' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                ].join(' ')}
              >
                {Icon && <Icon className="size-3.5 shrink-0" />}
                {itemLabel}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
