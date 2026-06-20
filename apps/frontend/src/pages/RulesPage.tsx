import { BookOpen, ShieldCheck } from "lucide-react";
import { gameRuleSections } from "../data/gameRules";

export function RulesPage() {
  return (
    <section className="grid gap-6">
      <header className="max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
          <BookOpen size={17} />
          Game Rules and Terms
        </div>
        <h1 className="text-4xl font-black text-white neon-text">Play fair. Keep the arena safe.</h1>
        <p className="mt-3 leading-7 text-slate-300">
          These rules apply to guests, account holders, scores, purchases, ads, support, and administrator decisions.
        </p>
      </header>

      <div className="rounded-lg border border-goldGlow/30 bg-goldGlow/10 p-4 text-sm leading-6 text-slate-200">
        <div className="mb-1 flex items-center gap-2 font-black text-goldGlow"><ShieldCheck size={18} /> Security reminder</div>
        Never share your password. Support and administrators will never ask for it.
      </div>

      <div className="grid gap-5">
        {gameRuleSections.map((section) => (
          <article key={section.title} className="arcade-border rounded-lg p-5">
            <h2 className="text-xl font-black text-white">{section.title}</h2>
            <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-300" start={section.start}>
              {section.rules.map((rule) => <li key={rule} className="ml-6 pl-2">{rule}</li>)}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
