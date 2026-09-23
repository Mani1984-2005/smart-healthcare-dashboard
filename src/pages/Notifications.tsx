import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, MessageSquare } from "lucide-react";
import { Badge, Button, EmptyState, MetricCard, PageHeader, Section } from "../components/ui";
import api from "../services/api.js";

type ReadFilter = "All" | "Unread" | "Read";

interface AppNotification {
  id: string;
  userId: string;
  userRole: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  isRead: boolean;
  createdAt: string;
}

export default function Notifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readFilter, setReadFilter] = useState<ReadFilter>("All");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/notifications");
      setItems(response?.data?.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (readFilter === "Unread" && n.isRead) return false;
      if (readFilter === "Read" && !n.isRead) return false;
      return true;
    });
  }, [items, readFilter]);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {
      // Reload to reflect server truth if the write failed.
      load();
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.put("/notifications/read-all");
    } catch {
      load();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communications"
        title="Notification center"
        description="In-app notifications for your account across appointments, lab, pharmacy, and billing."
        actions={
          <Button variant="secondary" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-100">
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          These are local, in-app notifications stored in the system database. SMS, email, and WhatsApp delivery are
          not configured and are not performed.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Unread" value={unreadCount} description="Requiring attention" icon={<Bell className="h-5 w-5" />} />
        <MetricCard label="Total" value={items.length} description="Delivered to you" />
        <MetricCard label="Types" value={new Set(items.map((n) => n.type)).size} description="Event categories" />
      </section>

      <Section
        title="Filters"
        description="Filter by read state"
        action={
          <div className="flex flex-wrap gap-2">
            {(["All", "Unread", "Read"] as ReadFilter[]).map((f) => (
              <Button key={f} variant={readFilter === f ? "primary" : "secondary"} className="min-h-8 px-3 text-xs" onClick={() => setReadFilter(f)}>
                {f}
              </Button>
            ))}
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Showing {filtered.length} of {items.length} notifications.
        </p>
      </Section>

      <Section title="Inbox" description={`${filtered.length} notification${filtered.length === 1 ? "" : "s"}`} action={<Badge variant="info">In-app</Badge>}>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading notifications…</div>
        ) : error ? (
          <EmptyState title="Unable to load notifications" description={error} icon={<Bell className="h-8 w-8" />} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No notifications" description="Nothing matches the current filters." icon={<Bell className="h-8 w-8" />} />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((n) => (
              <li key={n.id} className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between ${n.isRead ? "opacity-70" : ""}`}>
                <div className="flex gap-3">
                  <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                      {!n.isRead && <Badge variant="info">Unread</Badge>}
                      <Badge variant="neutral">{n.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                </div>
                {!n.isRead && (
                  <Button variant="secondary" className="shrink-0" onClick={() => markRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}