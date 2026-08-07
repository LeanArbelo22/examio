const tones = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  info: "border-blue-100 bg-blue-50 text-blue-700",
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  danger: "border-red-100 bg-red-50 text-red-700",
  indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
  purple: "border-purple-100 bg-purple-50 text-purple-700",
};

export type StatusBadgeTone = keyof typeof tones;

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: StatusBadgeTone;
}) {
  return (
    <span
      className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${tones[tone]}`}
    >
      {label}
    </span>
  );
}
