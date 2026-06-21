import { useEffect, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel: string;
}

export function Modal({ title, children, onClose, closeLabel }: ModalProps) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function closeOnBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur-md" onMouseDown={closeOnBackdrop}>
      <div className="arcade-border w-full max-w-md rounded-sm p-5 shadow-neon" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-white">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            aria-label={closeLabel}
            title={closeLabel}
            className="h-10 w-10 border border-white/15 bg-white/5 px-0"
            onClick={onClose}
            icon={<X size={18} />}
          >
            <span className="sr-only">{closeLabel}</span>
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
