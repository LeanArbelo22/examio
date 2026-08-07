import { FormFieldError } from "@/components/forms/FormFieldError";

export function ExamBasicInfoFields({
  title,
  description,
  errors,
  onTitleChange,
  onDescriptionChange,
  onBlur,
}: {
  title: string;
  description: string;
  errors: Record<string, string>;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onBlur: (field: "titulo" | "descripcion") => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
      <h2 className="mb-4 border-b border-slate-100 pb-2.5 text-sm font-bold uppercase tracking-wider text-slate-400">
        Información de la evaluación
      </h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="exam-title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Título</label>
          <input id="exam-title" value={title} maxLength={150} onChange={(event) => onTitleChange(event.target.value)} onBlur={() => onBlur("titulo")} aria-invalid={Boolean(errors.titulo)} aria-describedby={errors.titulo ? "exam-title-error" : undefined} className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100" placeholder="Ej: Primer parcial de Bases de Datos" />
          <FormFieldError id="exam-title-error" message={errors.titulo} />
        </div>
        <div>
          <label htmlFor="exam-description" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Descripción opcional</label>
          <textarea id="exam-description" rows={3} value={description} maxLength={1000} onChange={(event) => onDescriptionChange(event.target.value)} onBlur={() => onBlur("descripcion")} aria-invalid={Boolean(errors.descripcion)} aria-describedby={errors.descripcion ? "exam-description-error" : undefined} className="block w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100" placeholder="Indicaciones generales para los alumnos..." />
          <FormFieldError id="exam-description-error" message={errors.descripcion} />
        </div>
      </div>
    </section>
  );
}
