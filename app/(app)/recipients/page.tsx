"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AtSign,
  Heart,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

interface Recipient {
  id: string;
  name: string;
  nickname: string | null;
  relationship: string | null;
  notes: string | null;
  photo_url: string | null;
}

const RELATIONSHIPS = [
  "pareja",
  "mamá",
  "papá",
  "abuela",
  "abuelo",
  "amiga",
  "amigo",
  "otro",
] as const;

const REL_LABEL: Record<string, string> = {
  pareja: "Pareja",
  "mamá": "Mamá",
  "papá": "Papá",
  abuela: "Abuela",
  abuelo: "Abuelo",
  amiga: "Amiga",
  amigo: "Amigo",
  otro: "Otro",
};

const EMPTY_FORM = { name: "", nickname: "", relationship: "", notes: "" };

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<"closed" | "create" | "edit">("closed");
  const [editing, setEditing] = useState<Recipient | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recipients", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { recipients: Recipient[] };
      setRecipients(Array.isArray(data.recipients) ? data.recipients : []);
    } catch {
      setError(
        "No pudimos cargar tus personas. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal("create");
  };

  const openEdit = (r: Recipient) => {
    setEditing(r);
    setForm({
      name: r.name,
      nickname: r.nickname ?? "",
      relationship: r.relationship ?? "",
      notes: r.notes ?? "",
    });
    setFormError(null);
    setModal("edit");
  };

  const closeModal = () => {
    if (saving) return;
    setModal("closed");
    setEditing(null);
  };

  const setField = (key: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      nickname: form.nickname.trim() || undefined,
      relationship: form.relationship || undefined,
      notes: form.notes.trim() || undefined,
    };
    try {
      const res = await fetch(
        modal === "edit" && editing ? `/api/recipients/${editing.id}` : "/api/recipients",
        {
          method: modal === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo guardar.");
      }
      closeModal();
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "No se pudo guardar. Inténtalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/recipients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConfirmDelete(null);
      await load();
    } catch {
      setError("No pudimos eliminar a esta persona. Inténtalo de nuevo.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis personas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guárdalas una vez y llámalas por su apodo con @ cuando crees un
            detalle.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-pink-500/25 transition-all duration-200 hover:-translate-y-px hover:opacity-95 active:scale-[0.98]"
        >
          <Plus className="size-4" aria-hidden />
          Agregar
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-pink-500" aria-hidden />
          <p className="text-sm text-muted-foreground">Cargando tus personas…</p>
        </div>
      ) : recipients.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <Heart className="mx-auto size-10 text-pink-300" aria-hidden />
          <h2 className="mt-3 text-lg font-bold">Aún no hay nadie aquí</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Agrega a tu pareja, tu mamá, tu mejor amiga… y la IA recordará qué
            los mueve cuando les dediques algo.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-pink-500/25 transition-all duration-200 hover:-translate-y-px hover:opacity-95 active:scale-[0.98]"
          >
            <Plus className="size-4" aria-hidden />
            Agregar mi primera persona
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {recipients.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border bg-card p-4 shadow-sm transition-shadow duration-200 hover:shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-bold">{r.name}</h2>
                    {r.relationship && (
                      <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-semibold text-pink-700 dark:bg-pink-900 dark:text-pink-300">
                        {REL_LABEL[r.relationship] ?? r.relationship}
                      </span>
                    )}
                  </div>
                  {r.nickname && (
                    <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <AtSign className="size-3.5" aria-hidden />@{r.nickname}
                    </p>
                  )}
                  {r.notes && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {r.notes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    aria-label={`Editar ${r.name}`}
                    className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting}
                    aria-label={
                      confirmDelete === r.id
                        ? `Confirmar eliminar a ${r.name}`
                        : `Eliminar a ${r.name}`
                    }
                    className={`flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg transition-colors duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 ${
                      confirmDelete === r.id
                        ? "bg-red-50 text-red-600 dark:bg-red-950"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
              {confirmDelete === r.id && (
                <div
                  role="alert"
                  className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
                >
                  <span className="flex-1">
                    ¿Seguro que quieres eliminar a {r.name}? Sus dedicaciones se
                    quedan, pero perderás sus notas.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting}
                    className="min-h-[40px] cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
                  >
                    {deleting ? "Eliminando…" : "Sí, eliminar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="min-h-[40px] cursor-pointer rounded-lg border px-3 py-1.5 font-medium transition-colors duration-200 hover:bg-accent"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Modal agregar/editar */}
      {modal !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[4px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={modal === "edit" ? "Editar persona" : "Agregar persona"}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-background p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {modal === "edit" ? "Editar persona" : "Agregar persona"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Cerrar"
                className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              >
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="r-name"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  Nombre *
                </label>
                <input
                  id="r-name"
                  type="text"
                  value={form.name}
                  onChange={setField("name")}
                  placeholder="María"
                  autoComplete="off"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base transition-colors duration-200 placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>

              <div>
                <label
                  htmlFor="r-nickname"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  Apodo{" "}
                  <span className="font-normal text-muted-foreground">
                    (para llamarla con @)
                  </span>
                </label>
                <input
                  id="r-nickname"
                  type="text"
                  value={form.nickname}
                  onChange={setField("nickname")}
                  placeholder="mari"
                  autoComplete="off"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base transition-colors duration-200 placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>

              <div>
                <label
                  htmlFor="r-relationship"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  Relación
                </label>
                <select
                  id="r-relationship"
                  value={form.relationship}
                  onChange={setField("relationship")}
                  className="min-h-[48px] w-full cursor-pointer rounded-xl border border-input bg-background px-4 py-3 text-base transition-colors duration-200 focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                >
                  <option value="">Sin especificar</option>
                  {RELATIONSHIPS.map((rel) => (
                    <option key={rel} value={rel}>
                      {REL_LABEL[rel]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="r-notes"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  ¿Qué lo mueve?{" "}
                  <span className="font-normal text-muted-foreground">
                    (recuerdos, gustos…)
                  </span>
                </label>
                <textarea
                  id="r-notes"
                  value={form.notes}
                  onChange={setField("notes")}
                  rows={3}
                  placeholder="Ama las flores amarillas, lloró con aquella carta de 2019, su canción es…"
                  className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-base leading-relaxed transition-colors duration-200 placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-pink-500/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
              >
                {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {saving
                  ? "Guardando…"
                  : modal === "edit"
                    ? "Guardar cambios"
                    : "Agregar persona"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
