interface CommercialTagProps {
  className?: string;
}

export default function CommercialTag({ className }: CommercialTagProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 ${className ?? ""}`}
    >
      COM
    </span>
  );
}
