import React, { useId } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useModalA11y } from "../../lib/useModalA11y";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  className,
}) => {
  const titleId = useId();
  const containerRef = useModalA11y<HTMLDivElement>(isOpen, onClose);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#050038]/60 backdrop-blur-[8px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : "Dialog"}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-8 shadow-[0px_8px_32px_rgba(5,0,56,0.16)] focus:outline-none",
              className
            )}
          >
            <div className="flex items-center justify-between mb-6">
              {title && <h2 id={titleId} className="text-2xl font-bold text-[#050038]">{title}</h2>}
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1 text-[#050038]/40 hover:bg-[#fafafa] hover:text-[#050038] transition-colors"
              >
                <X size={32} />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
