import Link from "next/link";

interface DashboardCardProps {
  title: string;
  description: string;
  href: string;
}

export function DashboardCard({ title, description, href }: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
    >
      <span className="min-w-0 break-words">
        <span className="block text-base font-semibold text-slate-800 group-hover:text-indigo-700">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-slate-600">{description}</span>
      </span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-indigo-700">
        <path d="m9 5 7 7-7 7" />
      </svg>
    </Link>
  );
}
