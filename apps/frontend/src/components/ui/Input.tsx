import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, className = "", ...props }: InputProps) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      <span>{label}</span>
      <input
        className={`min-h-11 rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-cyanGlow focus:ring-2 focus:ring-cyanGlow/20 ${className}`}
        {...props}
      />
    </label>
  );
}
