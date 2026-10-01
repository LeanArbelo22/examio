import type { ReactNode } from "react";
import type { ComisionDocente } from "@/types/index";
import { FormFieldError } from "@/components/forms/FormFieldError";

type SettingsField = "duracionMinutos" | "cantidadIntentos" | "fechaInicio" | "fechaFin" | "idMateriaDivision";

interface ExamSettingsSidebarProps {
  duration: string; attempts: string; startDate: string; endDate: string;
  commissionId: string; commissions: ComisionDocente[]; loadingCommissions: boolean;
  minDate: string; maxDate: string; errors: Record<string, string>;
  allowedResources: string;
  onDurationChange: (value: string) => void; onAttemptsChange: (value: string) => void;
  onStartDateChange: (value: string) => void; onEndDateChange: (value: string) => void;
  onCommissionChange: (value: string) => void; onAllowedResourcesChange: (value: string) => void;
  onBlur: (field: SettingsField) => void;
}

export function ExamSettingsSidebar(props: ExamSettingsSidebarProps) {
  const fieldClass = "block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50";
  const field = (name: SettingsField) => ({
    "aria-invalid": Boolean(props.errors[name]),
    "aria-describedby": props.errors[name] ? `exam-${name}-error` : undefined,
    onBlur: () => props.onBlur(name),
  });

  return (
    <aside className="space-y-6">
      <SettingsCard title="Tiempo e intentos">
        <div>
          <label htmlFor="exam-duration" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Límite por intento (minutos)</label>
          <input id="exam-duration" type="number" min="1" value={props.duration} onChange={(event) => props.onDurationChange(event.target.value)} onWheel={(event) => event.currentTarget.blur()} {...field("duracionMinutos")} className={fieldClass} />
          <FormFieldError id="exam-duracionMinutos-error" message={props.errors.duracionMinutos} />
        </div>
        <div>
          <label htmlFor="exam-attempts" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Cantidad máxima de intentos</label>
          <input id="exam-attempts" type="number" min="1" max="10" value={props.attempts} onChange={(event) => props.onAttemptsChange(event.target.value)} onWheel={(event) => event.currentTarget.blur()} {...field("cantidadIntentos")} className={fieldClass} />
          <FormFieldError id="exam-cantidadIntentos-error" message={props.errors.cantidadIntentos} />
        </div>
      </SettingsCard>
      <SettingsCard title="Disponibilidad">
        <div>
          <label htmlFor="exam-start" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha de apertura</label>
          <input id="exam-start" type="datetime-local" value={props.startDate} min={props.minDate} max={props.maxDate} onChange={(event) => props.onStartDateChange(event.target.value)} {...field("fechaInicio")} className={fieldClass} />
          <FormFieldError id="exam-fechaInicio-error" message={props.errors.fechaInicio} />
        </div>
        <div>
          <label htmlFor="exam-end" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha de cierre</label>
          <input id="exam-end" type="datetime-local" value={props.endDate} min={props.startDate || props.minDate} max={props.maxDate} onChange={(event) => props.onEndDateChange(event.target.value)} {...field("fechaFin")} className={fieldClass} />
          <FormFieldError id="exam-fechaFin-error" message={props.errors.fechaFin} />
        </div>
      </SettingsCard>
      <SettingsCard title="Cátedra">
        <div>
          <label htmlFor="exam-commission" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Asignar a comisión</label>
          <select id="exam-commission" value={props.commissionId} onChange={(event) => props.onCommissionChange(event.target.value)} disabled={props.loadingCommissions || props.commissions.length === 0} {...field("idMateriaDivision")} className={fieldClass}>
            <option value="" disabled>{props.loadingCommissions ? "Cargando tus comisiones..." : props.commissions.length === 0 ? "No tenés comisiones asignadas" : "Seleccioná una comisión..."}</option>
            {props.commissions.map((commission) => <option key={commission.idComision} value={commission.idComision}>{commission.nombreMateria} — {commission.division}</option>)}
          </select>
          <FormFieldError id="exam-idMateriaDivision-error" message={props.errors.idMateriaDivision} />
        </div>
      </SettingsCard>
      <SettingsCard title="Recursos permitidos">
        <div>
          <label htmlFor="exam-allowed-resources" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Indicaciones para el alumno</label>
          <textarea id="exam-allowed-resources" rows={3} maxLength={500} value={props.allowedResources} onChange={(event) => props.onAllowedResourcesChange(event.target.value)} className={`${fieldClass} resize-none`} placeholder="Ej: calculadora científica y hoja de fórmulas" />
          <p className="mt-1 text-[11px] font-medium text-slate-500">Este texto informa recursos permitidos; no activa controles antifraude.</p>
        </div>
      </SettingsCard>
    </aside>
  );
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]"><h2 className="border-b border-slate-100 pb-2.5 text-sm font-bold uppercase tracking-wider text-slate-400">{title}</h2>{children}</section>;
}
