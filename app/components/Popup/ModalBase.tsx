"use client";

import { createPortal } from "react-dom";

const ModalBase = ({
  children,
  className,
  onClose,
  notTransparent = false,
  bgColor = "bg-base-100",
}: {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  notTransparent?: boolean;
  bgColor?: string;
}) => {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-9999 flex min-w-0 items-center justify-center bg-black/50 backdrop-blur-sm ${
        notTransparent ? `bg-opacity-100 ${bgColor}` : "bg-opacity-50"
      } ${className} animate-in fade-in duration-200`}
    >
      <div className="max-h-100vh w-full items-center justify-center overflow-y-auto">
        <div
          className="flex flex-1 items-center justify-center p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose?.();
            }
          }}
        >
          <div
            className="w-auto animate-in zoom-in-95 duration-200"
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
