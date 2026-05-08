"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";

const ModalBase = ({
  children,
  className,
  onClose,
  notTransparent = false,
  bgColor = "bg-base-100",
  ariaLabel = "Dialog",
}: {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  notTransparent?: boolean;
  bgColor?: string;
  ariaLabel?: string;
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    window.queueMicrotask(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable || panelRef.current)?.focus({ preventScroll: true });
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex min-w-0 items-center justify-center bg-black/55 backdrop-blur-sm ${
        notTransparent ? `bg-opacity-100 ${bgColor}` : "bg-opacity-50"
      } ${className} animate-in fade-in duration-200`}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose?.();
      }}
    >
      <div className="max-h-screen w-full items-center justify-center overflow-y-auto">
        <div
          className="flex min-h-screen flex-1 items-center justify-center p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose?.();
            }
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            tabIndex={-1}
            className="w-auto max-w-full animate-in zoom-in-95 duration-200 focus-visible:ring-0"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ModalBase;
