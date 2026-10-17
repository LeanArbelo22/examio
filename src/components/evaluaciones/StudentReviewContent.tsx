import Link from "next/link";
import { formatGrade } from "@/lib/attempt-grading";
import type { ContenidoRevisionIntento, OpcionIntento, PreguntaContenidoRevision } from "@/types";

const typeLabels: Record<string, string> = {
  mc: "Selección única", multiple: "Selección múltiple", vf: "Verdadero / Falso",
  abierta: "Desarrollo", code: "Programación",
};

function OptionRow({ option }: { option: OpcionIntento }) {
  const selected = option.fueSeleccionada === true || option.fueSeleccionada === 1;
  const className = option.esCorrecta
    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
    : selected ? "border-red-300 bg-red-50 text-red-900" : "border-slate-200 bg-slate-50 text-slate-600";
  const label = option.esCorrecta
    ? selected ? "Correcta y elegida" : "Respuesta correcta"
    : selected ? "Elegida, incorrecta" : null;
  return (
    <li className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${className}`}>
      <span>{option.texto}</span>
      {label && <span className="shrink-0 text-xs font-bold">{label}</span>}
    </li>
  );
}

function QuestionReview({ question }: { question: PreguntaContenidoRevision }) {
  const isText = question.tipo === "abierta" || question.tipo === "code";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {question.grupo && <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{question.grupo}</p>}
          <h3 className="mt-1 font-bold text-slate-900">{question.enunciado}</h3>
        </div>
        <span className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-800">{typeLabels[question.tipo] ?? question.tipo}</span>
      </div>
      {isText ? (
        <div className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {question.respuesta?.rtaTexto || <span className="italic text-slate-500">Sin respuesta</span>}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">{question.opciones.map((option) => <OptionRow key={option.idOpcion} option={option} />)}</ul>
      )}
      {(question.modoJustificacion ?? "sin_justificacion") !== "sin_justificacion" && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Justificación</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{question.respuesta?.justificacion || "Sin respuesta"}</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
        <span>Puntaje: <strong>{formatGrade(question.puntajeObtenido)} / {formatGrade(question.puntajeMaximo)}</strong></span>
        {question.comentariosDocente && <span>Devolución: <strong>{question.comentariosDocente}</strong></span>}
      </div>
    </article>
  );
}

export function StudentReviewContent({ data }: { data: ContenidoRevisionIntento }) {
  const passed = data.notaFinal !== null && data.notaFinal >= data.notaAprobacion;
  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Revisión del intento {data.numeroIntento}</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">{data.tituloEvaluacion}</h1>
            <p className="mt-2 text-sm text-slate-600">Contenido conservado del examen que rendiste.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-slate-500">Nota</p>
              <p className={`text-2xl font-black ${passed ? "text-emerald-700" : "text-red-600"}`}>{formatGrade(data.notaFinal, data.escalaCalificacion)}</p>
              <p className="text-xs text-slate-500">Aprueba con {formatGrade(data.notaAprobacion)}</p>
            </div>
            <Link href="/alumno/resultados" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700">Volver al historial</Link>
          </div>
        </div>
      </section>
      <section className="space-y-4" aria-label="Respuestas revisadas">
        {data.preguntas.map((question) => <QuestionReview key={question.idIntentoPregunta} question={question} />)}
      </section>
    </div>
  );
}
