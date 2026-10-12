"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import {
  useEtiquetasBanco,
  useGruposBanco,
  usePreguntasBanco,
  useResolverSeleccionBanco,
} from "@/hooks/useBancoPreguntas";
import {
  BankSelectionConflictError,
  buildPendingBankImports,
  type PendingBankImport,
} from "@/lib/exam-bank";
import { getUserErrorMessage } from "@/lib/errors";
import type {
  BancoGrupoListado,
  BancoPreguntaListado,
  TipoPregunta,
} from "@/types";

type SelectorTab = "preguntas" | "grupos";

export function QuestionBankSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  excludedQuestionIds,
  excludedGroupIds,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (imports: PendingBankImport[]) => void;
  excludedQuestionIds: number[];
  excludedGroupIds: number[];
}) {
  const [tab, setTab] = useState<SelectorTab>("preguntas");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [type, setType] = useState<TipoPregunta | "">("");
  const [tag, setTag] = useState<number | "">("");
  const [page, setPage] = useState(1);
  const [questions, setQuestions] = useState<BancoPreguntaListado[]>([]);
  const [groups, setGroups] = useState<BancoGrupoListado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const tagsQuery = useEtiquetasBanco();
  const questionsQuery = usePreguntasBanco(
    {
      texto: appliedSearch || undefined,
      estado: "disponible",
      tipo: type || undefined,
      etiqueta: tag || undefined,
      pagina: page,
      tamano: 10,
    },
    isOpen && tab === "preguntas",
  );
  const groupsQuery = useGruposBanco(
    {
      texto: appliedSearch || undefined,
      estado: "disponible",
      etiqueta: tag || undefined,
      pagina: page,
      tamano: 10,
    },
    isOpen && tab === "grupos",
  );
  const resolveSelection = useResolverSeleccionBanco();

  const close = () => {
    if (resolveSelection.isPending) return;
    setQuestions([]);
    setGroups([]);
    setError(null);
    onClose();
  };

  const applySearch = () => {
    setAppliedSearch(search.trim());
    setPage(1);
  };

  const toggleQuestion = (question: BancoPreguntaListado) => {
    setQuestions((current) =>
      current.some((item) => item.id === question.id)
        ? current.filter((item) => item.id !== question.id)
        : [...current, question],
    );
  };

  const toggleGroup = (group: BancoGrupoListado) => {
    setGroups((current) =>
      current.some((item) => item.id === group.id)
        ? current.filter((item) => item.id !== group.id)
        : [...current, group],
    );
  };

  const confirm = async () => {
    setError(null);
    try {
      const resolved = await resolveSelection.mutateAsync({
        preguntas: questions,
        grupos: groups,
      });
      const imports = buildPendingBankImports(
        resolved.preguntas,
        resolved.grupos,
        excludedQuestionIds,
        excludedGroupIds,
      );
      if (imports.length === 0) {
        setError("Seleccioná al menos una pregunta o grupo.");
        return;
      }
      onConfirm(imports);
      close();
    } catch (cause) {
      setError(
        cause instanceof BankSelectionConflictError
          ? cause.message
          : getUserErrorMessage(cause, "No se pudo preparar la selección del banco."),
      );
    }
  };

  const query = tab === "preguntas" ? questionsQuery : groupsQuery;
  const selectedCount = questions.length + groups.length;

  return (
    <Modal isOpen={isOpen} onClose={close} title="Agregar desde mi banco">
      <div className="space-y-5">
        <p className="text-sm text-slate-600">
          El contenido se incorporará como una copia independiente cuando guardes o publiques la evaluación.
        </p>

        <div role="tablist" aria-label="Tipo de contenido del banco" className="flex border-b border-slate-200">
          {(["preguntas", "grupos"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => {
                setTab(item);
                setPage(1);
              }}
              className={`border-b-2 px-4 py-2 text-sm font-bold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                tab === item
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="bank-selector-search" className="mb-1 block text-xs font-bold text-slate-600">
              Buscar
            </label>
            <div className="flex gap-2">
              <input
                id="bank-selector-search"
                value={search}
                maxLength={150}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applySearch();
                  }
                }}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                placeholder="Título o contenido"
              />
              <Button type="button" onClick={applySearch} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">
                Buscar
              </Button>
            </div>
          </div>
          {tab === "preguntas" && (
            <div>
              <label htmlFor="bank-selector-type" className="mb-1 block text-xs font-bold text-slate-600">Tipo</label>
              <select id="bank-selector-type" value={type} onChange={(event) => { setType(event.target.value as TipoPregunta | ""); setPage(1); }} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <option value="">Todos</option>
                <option value="mc">Selección única</option>
                <option value="multiple">Selección múltiple</option>
                <option value="vf">Verdadero / Falso</option>
                <option value="abierta">Abierta</option>
                <option value="code">Código</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="bank-selector-tag" className="mb-1 block text-xs font-bold text-slate-600">Etiqueta</label>
            <select id="bank-selector-tag" value={tag} onChange={(event) => { setTag(event.target.value ? Number(event.target.value) : ""); setPage(1); }} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <option value="">Todas</option>
              {(tagsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </div>
        </div>

        {query.isLoading && <LoadingState message="Cargando contenido del banco..." />}
        {query.isError && (
          <RequestErrorState error={query.error} fallback="No se pudo cargar el banco." onRetry={() => query.refetch()} showRetry />
        )}

        {!query.isLoading && !query.isError && tab === "preguntas" && (
          <SelectableQuestions
            items={questionsQuery.data?.items ?? []}
            selected={questions}
            excludedIds={excludedQuestionIds}
            onToggle={toggleQuestion}
          />
        )}
        {!query.isLoading && !query.isError && tab === "grupos" && (
          <SelectableGroups
            items={groupsQuery.data?.items ?? []}
            selected={groups}
            excludedIds={excludedGroupIds}
            onToggle={toggleGroup}
          />
        )}

        {query.data && query.data.total > query.data.tamano && (
          <Pagination
            page={query.data.pagina}
            totalPages={Math.ceil(query.data.total / query.data.tamano)}
            total={query.data.total}
            itemLabel={tab}
            onPageChange={setPage}
          />
        )}

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="text-xs font-semibold text-slate-500">
            {selectedCount} elemento{selectedCount === 1 ? "" : "s"} seleccionado{selectedCount === 1 ? "" : "s"}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={close} disabled={resolveSelection.isPending} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Cancelar</Button>
            <Button type="button" onClick={() => void confirm()} disabled={selectedCount === 0 || resolveSelection.isPending} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              {resolveSelection.isPending ? "Preparando..." : "Agregar selección"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SelectableQuestions({
  items,
  selected,
  excludedIds,
  onToggle,
}: {
  items: BancoPreguntaListado[];
  selected: BancoPreguntaListado[];
  excludedIds: number[];
  onToggle: (item: BancoPreguntaListado) => void;
}) {
  if (items.length === 0) return <EmptyState title="No hay preguntas disponibles" description="Probá con otros filtros o habilitá contenido desde el banco." />;
  return (
    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
      {items.map((item) => {
        const excluded = excludedIds.includes(item.id);
        return (
          <label key={item.id} className={`flex items-start gap-3 rounded-xl border p-3 ${excluded ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60" : "cursor-pointer border-slate-200 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500"}`}>
            <input type="checkbox" disabled={excluded} checked={selected.some((selectedItem) => selectedItem.id === item.id)} onChange={() => onToggle(item)} className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600" />
            <span className="min-w-0"><span className="block text-sm font-bold text-slate-800">{item.titulo}</span><span className="block truncate text-xs text-slate-500">{excluded ? "Ya incluida" : item.resumen || item.tipo.toUpperCase()}</span></span>
          </label>
        );
      })}
    </div>
  );
}

function SelectableGroups({
  items,
  selected,
  excludedIds,
  onToggle,
}: {
  items: BancoGrupoListado[];
  selected: BancoGrupoListado[];
  excludedIds: number[];
  onToggle: (item: BancoGrupoListado) => void;
}) {
  if (items.length === 0) return <EmptyState title="No hay grupos disponibles" description="Probá con otros filtros o habilitá un grupo desde el banco." />;
  return (
    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
      {items.map((item) => {
        const excluded = excludedIds.includes(item.id);
        return (
          <label key={item.id} className={`flex items-start gap-3 rounded-xl border p-3 ${excluded ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60" : "cursor-pointer border-slate-200 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500"}`}>
            <input type="checkbox" disabled={excluded} checked={selected.some((selectedItem) => selectedItem.id === item.id)} onChange={() => onToggle(item)} className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600" />
            <span><span className="block text-sm font-bold text-slate-800">{item.tituloReferencia}</span><span className="block text-xs text-slate-500">{excluded ? "Ya incluido" : `Revisión ${item.revision}`}</span></span>
          </label>
        );
      })}
    </div>
  );
}
