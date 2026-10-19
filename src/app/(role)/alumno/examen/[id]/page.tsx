'use client';

import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from "next-auth/react";
import {
  useIniciarIntento,
  useGetExamenesPendientes,
} from '@/hooks/useEvaluaciones';
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { getUserErrorMessage } from "@/lib/errors";

export default function ExamStartPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { data: session } = useSession();
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const idPublicacion = Number(id);

  // 1. Hook para leer la matrícula real del alumno en sesión
  const matriculaAlumno = session?.user?.identificadorInstitucional 
    ? Number(session.user.identificadorInstitucional) 
    : 0;

  const {
    data: pendientes,
    isLoading,
    isError,
  } = useGetExamenesPendientes(matriculaAlumno);
  const { mutate: iniciarIntento } = useIniciarIntento();
  const examData = pendientes?.find(
    (evaluacion) => evaluacion.idPublicacion === idPublicacion,
  );

  useEffect(() => {
    if (isLoading) return;
    if (isError) {
      router.replace("/alumno");
      return;
    }
    if (!examData || examData.intentosAgotados) {
      router.replace("/alumno");
    }
  }, [examData, isError, isLoading, router]);

  if (isLoading) {
    return (
      <div className="text-center py-12 text-sm font-medium text-slate-500">
        Cargando detalles institucionales de la evaluación...
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="text-center py-12 text-sm font-medium text-slate-500">
        La evaluación solicitada no existe o no se encuentra disponible.
      </div>
    );
  }

  const mappedExam = {
    carrera: examData.carrera,
    catedra: examData.materia,
    subject: examData.titulo,
    professor: examData.docente,
    duration: examData.duracionMinutos,
    dueDate: examData.fechaFin,
    recursosPermitidos: examData.recursosPermitidos,
  };

  const handleStartExam = () => {
    setIsLaunching(true);
    setLaunchError(null);
    
    iniciarIntento(
      { IdPublicacion: idPublicacion, IdAlumno: matriculaAlumno },
      {
        onSuccess: (data) => {
          const { idIntento } = data;
          if (!idIntento) {
            setIsLaunching(false);
            setLaunchError("No se pudo iniciar el intento correctamente.");
            return;
          }
          const deadline = Date.now() + (mappedExam.duration || 90) * 60 * 1000;
          sessionStorage.setItem(`examio_deadline_${idIntento}`, String(deadline));
          router.push(`/alumno/examen/${idIntento}/actividad/1`);
        },
        onError: (error) => {
          setIsLaunching(false);
          setLaunchError(
            getUserErrorMessage(error, "No se pudo iniciar el examen."),
          );
        }
      }
    );
  };

  return (
    <div className="max-w-5xl w-full mx-auto p-2 antialiased">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b border-slate-200/60 pb-6">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-md">
            {mappedExam.carrera} • {mappedExam.catedra}
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl mt-2.5">
            {mappedExam.subject}
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-1">
            Profesor a cargo: <span className="text-slate-600">{mappedExam.professor || "Sin asignar"}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white border border-slate-200/80 px-4 py-3 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] self-start md:self-center">
          <span className="text-xl">⏱️</span>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duración total</p>
            <p className="font-mono text-base font-bold text-slate-800">
              {mappedExam.duration ? `${mappedExam.duration} min` : "Sin límite"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            {launchError && (
              <div className="mb-4">
                <FeedbackMessage variant="error" message={launchError} />
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              📝 Instrucciones Generales
            </h3>
            
            <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
              <p>Leé atentamente cada consigna antes de responder.</p>
              <p>• Asegúrate de contar con una conexión estable a internet durante la resolución.</p>
              <p>• La navegación entre reactivos quedará registrada con telemetría de permanencia.</p>
            </div>

            <div className="mt-6 bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex gap-3 text-amber-900 text-sm">
              <span className="text-lg select-none pt-0.5">⚠️</span>
              <div className="space-y-1.5">
                <p className="font-bold tracking-tight text-amber-900">Supervisión durante el examen</p>
                <p className="text-amber-800/90 leading-relaxed text-xs">
                  Al comenzar se aplicarán las condiciones configuradas para esta evaluación. Las interrupciones, cambios de ventana, pérdidas de conexión y salidas de pantalla completa se registran; la plataforma aplicará la consecuencia informada por el sistema.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <Link href="/alumno" className="w-full sm:w-auto order-2 sm:order-1">
                <Button className="w-full sm:w-auto bg-slate-100 border border-slate-200 text-slate-700 px-5 py-3 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-all">
                  Volver al panel
                </Button>
              </Link>
              <Button
                onClick={handleStartExam}
                disabled={isLaunching}
                className="w-full sm:flex-1 bg-emerald-600 text-white px-6 py-3 text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-sm active:scale-[0.99] transition-all order-1 sm:order-2 disabled:opacity-50"
              >
                {isLaunching ? "Configurando entorno..." : "Comenzar Examen"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase mb-3 text-slate-400">
              ℹ️ Información de Cierre
            </h3>
            <div className="text-xs text-slate-600 space-y-2">
              <p>Disponible hasta:</p>
              <p className="font-mono font-bold text-slate-800 bg-slate-50 border border-slate-100 p-2 rounded-lg text-center">
                {new Date(mappedExam.dueDate).toLocaleString("es-AR")}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5 text-center">
            <span className="text-xl">🛠️</span>
            <h4 className="text-xs font-bold text-slate-700 tracking-tight mt-2">Recursos Autorizados</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
              {mappedExam.recursosPermitidos || "Ninguno. Software EXAMIO en ejecución estricta."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
