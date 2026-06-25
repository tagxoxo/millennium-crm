import type { ClientState } from "@/lib/types";

interface StateTagProps {
  state: ClientState;
  className?: string;
}

export default function StateTag({ state, className }: StateTagProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 ${className ?? ""}`}
      title={state}
    >
      {state}
    </span>
  );
}
