"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { eventsService } from "@/lib/services/events";
import { EventCategory, EventResponse, EventStatus } from "@/types";
import { useAuth } from "@/context/AuthContext";

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  CANCELLED: "Annulé",
  COMPLETED: "Terminé",
};

const STATUS_COLORS: Record<EventStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  CONCERT: "Concert",
  THEATRE: "Théâtre",
  CONFERENCE: "Conférence",
  SPORT: "Sport",
  FESTIVAL: "Festival",
  OTHER: "Autre",
};

export default function AdminEventsPage() {
  const router = useRouter();
  const { isAuthenticated, initialized, user } = useAuth();
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "ADMIN") {
      router.push("/events");
      return;
    }

    eventsService
      .filter({})
      .then((res) => setEvents(res.data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Erreur de chargement")
      )
      .finally(() => setLoading(false));
  }, [initialized, isAuthenticated, user?.role, router]);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="animate-spin w-8 h-8 border-4 border-zinc-300 border-t-zinc-900 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-3"
            >
              ← Dashboard admin
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Gestion des événements
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              L&apos;administrateur peut modifier les événements de tous les organisateurs.
            </p>
          </div>
          <Link
            href="/events/new"
            className="rounded-xl bg-zinc-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            + Créer un événement
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {events.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Aucun événement trouvé.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              >
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="w-full h-44 bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-5xl">
                    🎟️
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + STATUS_COLORS[event.status]}>
                      {STATUS_LABELS[event.status]}
                    </span>
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                      {CATEGORY_LABELS[event.category]}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {event.title}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {event.location} · {new Date(event.eventDate).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                    Organisateur : {event.organizerName}
                  </p>

                  <div className="flex items-center gap-2 mt-4">
                    <Link
                      href={"/events/" + event.id}
                      className="flex-1 text-center rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Voir
                    </Link>
                    <Link
                      href={"/events/" + event.id + "/edit"}
                      className="flex-1 text-center rounded-lg bg-zinc-900 dark:bg-white px-3 py-2 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                    >
                      ✏️ Modifier
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}