import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-cyanGlow text-ink shadow-neon hover:bg-sky-300 disabled:bg-slate-500 disabled:text-slate-900",
  secondary:
    "bg-panelSoft text-slate-100 border border-slate-600 hover:border-cyanGlow hover:text-white",
  danger:
    "bg-magentaGlow text-white shadow-danger hover:bg-pink-500 disabled:bg-slate-500",
  ghost: "bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
};

export function Button({ children, className = "", variant = "primary", icon, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${className}`}
      {...props}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}
