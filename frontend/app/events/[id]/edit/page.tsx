"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { eventsService } from "@/lib/services/events";
import { EventCategory, EventResponse } from "@/types";
import { useAuth } from "@/context/AuthContext";

const CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: "CONCERT", label: "Concert" },
  { value: "THEATRE", label: "Théâtre" },
  { value: "CONFERENCE", label: "Conférence" },
  { value: "SPORT", label: "Sport" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "OTHER", label: "Autre" },
];

const INPUT_CLASS =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400";

const LABEL_CLASS =
  "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  return value.slice(0, 16);
}

function toBackendDate(value: string) {
  return value ? value.slice(0, 16).padEnd(19, ":00") : undefined;
}

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, initialized, user } = useAuth();
  const canEdit =
    initialized &&
    isAuthenticated &&
    (user?.role === "ADMIN" || user?.role === "ORGANIZER");

  const [event, setEvent] = useState<EventResponse | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    location: "",
    totalSeats: "",
    price: "",
    category: "OTHER" as EventCategory,
    reservationDeadline: "",
    paymentDeadline: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!initialized) return;

    if (
      !isAuthenticated ||
      (user?.role !== "ADMIN" && user?.role !== "ORGANIZER")
    ) {
      router.replace("/events");
      return;
    }

    eventsService
      .getById(Number(id))
      .then((res) => {
        const ev = res.data;
        setEvent(ev);
        setForm({
          title: ev.title ?? "",
          description: ev.description ?? "",
          eventDate: toDateTimeLocal(ev.eventDate),
          location: ev.location ?? "",
          totalSeats: String(ev.totalSeats ?? ""),
          price: String(ev.price ?? ""),
          category: ev.category ?? "OTHER",
          reservationDeadline: toDateTimeLocal(ev.reservationDeadline),
          paymentDeadline: toDateTimeLocal(ev.paymentDeadline),
        });
        setImagePreview(ev.imageUrl || null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Impossible de charger l'événement");
      })
      .finally(() => setLoading(false));
  }, [id, initialized, isAuthenticated, user?.role, router]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(event?.imageUrl || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !canEdit) return;

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await eventsService.update(event.id, {
        title: form.title,
        description: form.description || undefined,
        eventDate: toBackendDate(form.eventDate)!,
        location: form.location,
        totalSeats: Number(form.totalSeats),
        price: Number(form.price),
        category: form.category,
        reservationDeadline: toBackendDate(form.reservationDeadline),
        paymentDeadline: toBackendDate(form.paymentDeadline),
      });

      if (imageFile) {
        await eventsService.uploadImage(event.id, imageFile);
      }

      setSuccess("Événement modifié avec succès.");
      router.push(`/events/${event.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="animate-spin w-8 h-8 border-4 border-zinc-300 border-t-zinc-900 rounded-full" />
      </div>
    );
  }

  if (!canEdit) return null;

  if (error && !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-900 px-4">
        <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
        <Link href="/events" className="text-sm underline text-zinc-700 dark:text-zinc-300">
          Retour aux événements
        </Link>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href={user?.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/organizer"}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-6"
        >
          ← Retour au dashboard
        </Link>

        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Modifier l&apos;événement
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {user?.role === "ADMIN"
                  ? "Vous pouvez modifier cet événement en tant qu'administrateur."
                  : "Vous pouvez modifier uniquement vos propres événements."}
              </p>
            </div>
            <span className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
              {event.status}
            </span>
          </div>

          {error && (
            <div className="mb-5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={LABEL_CLASS}>Titre *</label>
              <input type="text" required value={form.title} onChange={set("title")} className={INPUT_CLASS} />
            </div>

            <div>
              <label className={LABEL_CLASS}>Description</label>
              <textarea rows={4} value={form.description} onChange={set("description")} className={INPUT_CLASS} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>Date et heure *</label>
                <input
                  type="datetime-local"
                  required
                  value={form.eventDate}
                  onChange={set("eventDate")}
                  className={INPUT_CLASS}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Lieu *</label>
                <input type="text" required value={form.location} onChange={set("location")} className={INPUT_CLASS} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>Date limite de réservation</label>
                <input
                  type="datetime-local"
                  value={form.reservationDeadline}
                  onChange={set("reservationDeadline")}
                  className={INPUT_CLASS}
                  max={form.eventDate || undefined}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Date limite de paiement</label>
                <input
                  type="datetime-local"
                  value={form.paymentDeadline}
                  onChange={set("paymentDeadline")}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={LABEL_CLASS}>Nombre de places *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.totalSeats}
                  onChange={set("totalSeats")}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Prix (€) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={set("price")}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Catégorie</label>
                <select value={form.category} onChange={set("category")} className={INPUT_CLASS}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={LABEL_CLASS}>Image de l&apos;événement</label>
              <div
                className="mt-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 px-6 py-8 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                onClick={() => document.getElementById("edit-event-image")?.click()}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={form.title || "Aperçu"}
                    className="max-h-56 max-w-full rounded-lg object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-2xl mb-2">🖼️</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Cliquez pour choisir une nouvelle image</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">PNG, JPG, WEBP — max 10 Mo</p>
                  </div>
                )}
                <input
                  id="edit-event-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
              {imageFile && (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Nouvelle image : <span className="font-medium">{imageFile.name}</span>
                </p>
              )}
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                L&apos;image existante est conservée tant que vous ne sélectionnez pas de nouvelle image.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-60"
              >
                {saving ? "Enregistrement…" : "Enregistrer les modifications"}
              </button>
              <Link
                href={`/events/${event.id}`}
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Annuler
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
