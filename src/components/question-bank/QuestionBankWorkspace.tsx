"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ManagementFilterPanel } from "@/components/admin/ManagementFilterPanel";
import { ManagementPageHeader } from "@/components/admin/ManagementPageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  useEtiquetasBanco,
  useGruposBanco,
  usePreguntasBanco,
} from "@/hooks/useBancoPreguntas";
import type {
  BancoGrupoFiltros,
  BancoPreguntaFiltros,
  EstadoBanco,
  TipoPregunta,
} from "@/types";

type BankTab = "preguntas" | "grupos";

const statusTone = {
  borrador: "warning",
  disponible: "success",
  archivado: "neutral",
} as const;

function numericParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function QuestionBankWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: BankTab = params.get("tab") === "grupos" ? "grupos" : "preguntas";
  const [text, setText] = useState(params.get("texto") ?? "");
  const tagsQuery = useEtiquetasBanco();
  const page = numericParam(params.get("pagina"), 1);
  const statusParam = params.get("estado");
  const status = (["borrador", "disponible", "archivado"] as const).find(
    (value) => value === statusParam,
  ) as EstadoBanco | undefined;
  const typeParam = params.get("tipo");
  const type = (["mc", "vf", "abierta", "code"] as const).find(
    (value) => value === typeParam,
  ) as TipoPregunta | undefined;
  const parsedTag = numericParam(params.get("etiqueta"), 0);
  const tag = parsedTag > 0 ? parsedTag : undefined;

  const replaceParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}?${next.toString()}`);
  };

  const changeTab = (nextTab: BankTab) => {
    setText("");
    router.replace(`${pathname}?tab=${nextTab}`);
  };

  const commonFilters = {
    texto: params.get("texto") || undefined,
    estado: status,
    etiqueta: tag,
    pagina: page,
    tamano: 20,
  };

  return (
    <div className="space-y-6">
      <ManagementPageHeader
        title="Banco de preguntas"
        description="Creá y organizá preguntas y grupos reutilizables, sin depender de una evaluación."
        actions={
          <Link
            href={
              tab === "preguntas"
                ? "/profesor/banco-preguntas/preguntas/nueva"
                : "/profesor/banco-preguntas/grupos/nuevo"
            }
            className="inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {tab === "preguntas" ? "+ Nueva pregunta" : "+ Nuevo grupo"}
          </Link>
        }
      />

      <div role="tablist" aria-label="Contenido del banco" className="flex gap-2 border-b border-slate-200">
        {(["preguntas", "grupos"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => changeTab(item)}
            className={`border-b-2 px-4 py-2.5 text-sm font-bold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              tab === item
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <ManagementFilterPanel columnCount={4}>
        <div>
          <label htmlFor="bank-filter-text" className="mb-1 block text-xs font-bold text-slate-600">Buscar</label>
          <input id="bank-filter-text" value={text} maxLength={150} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") replaceParams({ texto: text.trim() || undefined, pagina: undefined }); }} placeholder="Título o enunciado" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
        </div>
        <div>
          <label htmlFor="bank-filter-status" className="mb-1 block text-xs font-bold text-slate-600">Estado</label>
          <select id="bank-filter-status" value={status ?? ""} onChange={(event) => replaceParams({ estado: event.target.value || undefined, pagina: undefined })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <option value="">Borradores y disponibles</option>
            <option value="borrador">Borrador</option>
            <option value="disponible">Disponible</option>
            <option value="archivado">Archivado</option>
          </select>
        </div>
        {tab === "preguntas" ? (
          <div>
            <label htmlFor="bank-filter-type" className="mb-1 block text-xs font-bold text-slate-600">Tipo</label>
            <select id="bank-filter-type" value={type ?? ""} onChange={(event) => replaceParams({ tipo: event.target.value || undefined, pagina: undefined })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="mc">Selección única</option>
              <option value="multiple">Selección múltiple</option>
              <option value="vf">Verdadero / Falso</option>
              <option value="abierta">Abierta</option>
              <option value="code">Código</option>
            </select>
          </div>
        ) : <div />}
        <div>
          <label htmlFor="bank-filter-tag" className="mb-1 block text-xs font-bold text-slate-600">Etiqueta</label>
          <select id="bank-filter-tag" value={tag ?? ""} onChange={(event) => replaceParams({ etiqueta: event.target.value || undefined, pagina: undefined })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <option value="">Todas</option>
            {(tagsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <Button type="button" onClick={() => replaceParams({ texto: text.trim() || undefined, pagina: undefined })} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">Buscar</Button>
          <Button type="button" onClick={() => { setText(""); router.replace(`${pathname}?tab=${tab}`); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Limpiar filtros</Button>
        </div>
      </ManagementFilterPanel>

      {tab === "preguntas" ? (
        <QuestionList filters={{ ...commonFilters, tipo: type }} onPageChange={(nextPage) => replaceParams({ pagina: String(nextPage) })} />
      ) : (
        <GroupList filters={commonFilters} onPageChange={(nextPage) => replaceParams({ pagina: String(nextPage) })} />
      )}
    </div>
  );
}

function QuestionList({ filters, onPageChange }: { filters: BancoPreguntaFiltros; onPageChange: (page: number) => void }) {
  const query = usePreguntasBanco(filters);
  if (query.isLoading) return <LoadingState message="Cargando preguntas..." />;
  if (query.isError) return <RequestErrorState error={query.error} fallback="No se pudieron cargar las preguntas." onRetry={() => query.refetch()} showRetry />;
  if (!query.data?.items.length) return <EmptyState title="No hay preguntas para estos filtros" description="Creá una pregunta o modificá los filtros de búsqueda." />;
  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Pregunta</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Revisión</th><th className="px-4 py-3 text-right">Acción</th></tr></thead>
          <tbody>{query.data.items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3"><p className="font-bold text-slate-800">{item.titulo}</p><p className="mt-0.5 max-w-xl truncate text-xs text-slate-500">{item.resumen || "Sin enunciado"}</p></td><td className="px-4 py-3 font-semibold uppercase text-slate-600">{item.tipo}</td><td className="px-4 py-3"><StatusBadge label={item.estado} tone={statusTone[item.estado]} /></td><td className="px-4 py-3 text-slate-500">{item.revision}</td><td className="px-4 py-3 text-right"><Link href={`/profesor/banco-preguntas/preguntas/${item.id}/editar`} className="rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Editar</Link></td></tr>)}</tbody>
        </table>
      </div>
      <Pagination page={query.data.pagina} totalPages={Math.ceil(query.data.total / query.data.tamano)} total={query.data.total} itemLabel="preguntas" onPageChange={onPageChange} />
    </>
  );
}

function GroupList({ filters, onPageChange }: { filters: BancoGrupoFiltros; onPageChange: (page: number) => void }) {
  const query = useGruposBanco(filters);
  if (query.isLoading) return <LoadingState message="Cargando grupos..." />;
  if (query.isError) return <RequestErrorState error={query.error} fallback="No se pudieron cargar los grupos." onRetry={() => query.refetch()} showRetry />;
  if (!query.data?.items.length) return <EmptyState title="No hay grupos para estos filtros" description="Creá un grupo o modificá los filtros de búsqueda." />;
  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Grupo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Revisión</th><th className="px-4 py-3 text-right">Acción</th></tr></thead>
          <tbody>{query.data.items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3 font-bold text-slate-800">{item.tituloReferencia}</td><td className="px-4 py-3"><StatusBadge label={item.estado} tone={statusTone[item.estado]} /></td><td className="px-4 py-3 text-slate-500">{item.revision}</td><td className="px-4 py-3 text-right"><Link href={`/profesor/banco-preguntas/grupos/${item.id}/editar`} className="rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Editar</Link></td></tr>)}</tbody>
        </table>
      </div>
      <Pagination page={query.data.pagina} totalPages={Math.ceil(query.data.total / query.data.tamano)} total={query.data.total} itemLabel="grupos" onPageChange={onPageChange} />
    </>
  );
}
