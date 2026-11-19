import { useId } from "react";

type SupervisionCamaraProps = {
  habilitado: boolean;
  intervalo: string;
  onHabilitadoChange: (enabled: boolean) => void;
  onIntervaloChange: (interval: string) => void;
};

export function SupervisionCamara({
  habilitado,
  intervalo,
  onHabilitadoChange,
  onIntervaloChange,
}: SupervisionCamaraProps) {
  const helpId = useId();
  const segundosIntervalo = Number(intervalo);
  const intervaloInvalido =
    habilitado &&
    (!/^\d+$/.test(intervalo) ||
      segundosIntervalo < 30 ||
      segundosIntervalo > 300);

  return (
    <fieldset className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <legend className="px-2 text-sm font-black text-slate-800">
        Fotos durante el examen
      </legend>

      <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <input
          type="checkbox"
          checked={habilitado}
          onChange={(event) => onHabilitadoChange(event.target.checked)}
          className="h-4 w-4 accent-indigo-600"
        />
        Tomar fotos durante el examen
      </label>

      {habilitado && (
        <div className="mt-3">
          <label className="block text-sm font-bold text-slate-800">
            Intervalo entre fotos (segundos)
            <input
              type="number"
              min={30}
              max={300}
              step={1}
              value={intervalo}
              onChange={(event) => onIntervaloChange(event.target.value)}
              aria-invalid={intervaloInvalido}
              aria-describedby={helpId}
              className="mt-1.5 block w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <p
            id={helpId}
            className={`mt-1 text-sm ${intervaloInvalido ? "text-red-700" : "text-slate-600"}`}>
            {intervaloInvalido
              ? "Ingresá un número entero entre 30 y 300 segundos."
              : "Podés elegir entre 30 y 300 segundos."}
          </p>
        </div>
      )}
    </fieldset>
  );
}