import React, { useEffect, useRef, useState } from 'react';
import {
  CloseOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled
} from '@ant-design/icons';
import './Modal.css';

const ICONS = {
  success: <CheckCircleFilled />,
  error: <CloseCircleFilled />,
  warning: <ExclamationCircleFilled />,
  info: <InfoCircleFilled />
};

const CLOSE_ANIMATION_MS = 200;

/**
 * Generic, accessible modal dialog with a fade + scale open/close transition.
 * `isOpen` toggling to false keeps the dialog mounted for CLOSE_ANIMATION_MS
 * so the exit transition can play instead of the dialog vanishing instantly.
 * Callers (e.g. ModalProvider) are responsible for keeping title/message/
 * actions/children populated for that same window.
 */
function Modal({ isOpen, onClose, title, message, variant = 'info', actions, children }) {
  const [shouldRender, setShouldRender] = useState(false);
  const [animateOpen, setAnimateOpen] = useState(false);

  const dialogRef = useRef(null);
  const closeTimerRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      clearTimeout(closeTimerRef.current);
      previouslyFocusedRef.current = document.activeElement;
      setShouldRender(true);
      const raf = requestAnimationFrame(() => setAnimateOpen(true));
      return () => cancelAnimationFrame(raf);
    }

    if (shouldRender) {
      setAnimateOpen(false);
      closeTimerRef.current = setTimeout(() => {
        setShouldRender(false);
        previouslyFocusedRef.current?.focus?.();
      }, CLOSE_ANIMATION_MS);
    }
    return () => clearTimeout(closeTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender || !animateOpen) return undefined;

    const focusFirstElement = () => {
      const el =
        dialogRef.current?.querySelector('input, textarea') ||
        dialogRef.current?.querySelector('[data-autofocus="true"]') ||
        dialogRef.current?.querySelector('button');
      el?.focus();
    };
    focusFirstElement();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldRender, animateOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      className={`app-modal-backdrop ${animateOpen ? 'open' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`app-modal app-modal-${variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        aria-describedby="app-modal-message"
        ref={dialogRef}
      >
        <button type="button" className="app-modal-close" onClick={onClose} aria-label="Close dialog">
          <CloseOutlined />
        </button>

        <div className={`app-modal-icon app-modal-icon-${variant}`}>
          {ICONS[variant] || ICONS.info}
        </div>

        {title && (
          <h3 id="app-modal-title" className="app-modal-title">
            {title}
          </h3>
        )}
        {message && (
          <p id="app-modal-message" className="app-modal-message">
            {message}
          </p>
        )}

        {children}

        {actions && actions.length > 0 && (
          <div className="app-modal-actions">
            {actions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                className={action.className || 'btn-secondary'}
                onClick={action.onClick}
                data-autofocus={action.autoFocus ? 'true' : undefined}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
