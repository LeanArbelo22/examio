import { Suspense } from 'react';

export default function ExamenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-transparent flex flex-col flex-grow">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-500 antialiased">
          Cargando entorno de evaluación...
        </div>
      }>
        {children}
      </Suspense>
    </div>
  );
}