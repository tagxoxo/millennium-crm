import type { TermMonths } from "@/lib/types";

interface TermTagProps {
  termMonths: TermMonths;
  className?: string;
}

export default function TermTag({ termMonths, className }: TermTagProps) {
  const isSixMonth = termMonths === 6;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${
        isSixMonth
          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
          : "bg-slate-500/20 text-slate-400 border-slate-500/40"
      } ${className ?? ""}`}
    >
      {isSixMonth ? "6MO" : "12MO"}
    </span>
  );
}
