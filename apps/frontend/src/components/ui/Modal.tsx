import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel: string;
}

export function Modal({ title, children, onClose, closeLabel }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur-md">
      <div className="arcade-border w-full max-w-md rounded-sm p-5 shadow-neon">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-white">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            aria-label={closeLabel}
            title={closeLabel}
            className="h-10 w-10 px-0"
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
