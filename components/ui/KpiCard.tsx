interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
}

export default function KpiCard({ label, value, subtext }: KpiCardProps) {
  return (
    <div className="bg-navy-light border border-navy-lighter rounded-xl p-4 md:p-5">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}
