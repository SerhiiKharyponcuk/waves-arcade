import type { ReactNode } from "react";

export function SettingSection({ title, children, locked = false }: { title: string; children: ReactNode; locked?: boolean }) {
  return (
    <section className={`rounded-lg border p-4 ${locked ? "border-white/10 bg-white/[0.025] opacity-70" : "border-white/10 bg-white/5"}`}>
      <h2 className="mb-4 text-lg font-black text-white">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

export function ToggleSetting({ label, checked, onChange, disabled = false, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-4 text-sm text-slate-200">
      <span>{label}{hint ? <small className="mt-1 block text-xs leading-5 text-slate-500">{hint}</small> : null}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-cyanGlow" />
    </label>
  );
}

export function RangeSetting({ label, value, min = 0, max = 1, step = 0.05, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-2 text-sm text-slate-200">
      <span className="flex justify-between gap-3"><span>{label}</span><strong className="text-cyanGlow">{Math.round(value * 100)}%</strong></span>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-cyanGlow" />
    </label>
  );
}
