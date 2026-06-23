interface SpanishTagProps {
  className?: string;
}

export default function SpanishTag({ className }: SpanishTagProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/40 ${className ?? ""}`}
    >
      ES
    </span>
  );
}
