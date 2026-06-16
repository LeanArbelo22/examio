"use client";

import Link from "next/link";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  accentColor: string;
  badgeCount?: number | string;
}

export function DashboardCard({ title, description, icon, href, accentColor, badgeCount }: DashboardCardProps) {
  return (
    <Link 
      href={href}
      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all duration-300 flex flex-col justify-between group"
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          {/* Círculo contenedor del Icono */}
          <div className={`h-10 w-10 rounded-xl bg-slate-50 border flex items-center justify-center text-lg shadow-sm transition-colors group-hover:bg-white`}>
            {icon}
          </div>
          
          {/* Contador Dinámico Integrado si existe */}
          {badgeCount !== undefined && (
            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${accentColor}`}>
              {badgeCount}
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-slate-800 tracking-tight transition-colors group-hover:text-indigo-600">
          {title}
        </h3>
        <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1.5">
          {description}
        </p>
      </div>

      <div className="mt-4 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
        <span>Gestionar registros</span>
        <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </Link>
  );
}