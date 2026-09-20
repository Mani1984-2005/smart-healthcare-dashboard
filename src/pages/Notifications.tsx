import { useMemo, useState } from "react";
import { AlertTriangle, Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { notifications as seedNotifications, type DemoNotification } from "../demo/prototypeData";
import { Badge, Button, EmptyState, MetricCard, PageHeader, Section } from "../components/ui";

type ChannelFilter = "All" | "SMS" | "Email" | "In-app";
type ReadFilter = "All" | "Unread" | "Read";

const channelIcon = {
  SMS: Smartphone,
  Email: Mail,
  "In-app": MessageSquare,
} as const;

function priorityVariant(p: DemoNotification["priority"]): "neutral" | "info" | "warning" | "critical" {
  if (p === "critical") return "critical";
  if (p === "high") return "warning";
  if (p === "low") return "neutral";
  return "info";
}

export default function Notifications() {
  const [items, setItems] = useState<DemoNotification[]>(() => seedNotifications.map((n) => ({ ...n })));
  const [channel, setChannel] = useState<ChannelFilter>("All");
  const [readFilter, setReadFilter] = useState<ReadFilter>("All");

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (channel !== "All" && n.channel !== channel) return false;
      if (readFilter === "Unread" && n.read) return false;
      if (readFilter === "Read" && !n.read) return false;
      return true;
    });
  }, [items, channel, readFilter]);

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communications"
        title="Notification center"
        description="Review operational alerts across SMS, email, and in-app channels."
        actions={
          <Button variant="secondary" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Live notification API is reserved for backend integration. This center uses prototype data only.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Unread" value={unreadCount} description="Requiring attention" icon={<Bell className="h-5 w-5" />} />
        <MetricCard label="Total" value={items.length} description="In demo inbox" />
        <MetricCard label="Critical / high" value={items.filter((n) => n.priority === "critical" || n.priority === "high").length} description="Priority alerts" />
      </section>

      <Section
        title="Filters"
        description="Client-side filters over demo notifications"
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
        <div className="flex flex-wrap gap-2">
          {(["All", "SMS", "Email", "In-app"] as ChannelFilter[]).map((c) => (
            <Button key={c} variant={channel === c ? "primary" : "ghost"} className="min-h-8 px-3 text-xs" onClick={() => setChannel(c)}>
              {c}
            </Button>
          ))}
        </div>
      </Section>

      <Section title="Inbox" description={`${filtered.length} notification${filtered.length === 1 ? "" : "s"}`} action={<Badge variant="neutral">Demo</Badge>}>
        {filtered.length === 0 ? (
          <EmptyState title="No notifications" description="Nothing matches the current filters." icon={<Bell className="h-8 w-8" />} />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((n) => {
              const Icon = channelIcon[n.channel];
              return (
                <li key={n.id} className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between ${n.read ? "opacity-70" : ""}`}>
                  <div className="flex gap-3">
                    <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                        {!n.read && <Badge variant="info">Unread</Badge>}
                        <Badge variant={priorityVariant(n.priority)}>{n.priority}</Badge>
                        <Badge variant="neutral">{n.channel}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{n.body}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  {!n.read && (
                    <Button variant="secondary" className="shrink-0" onClick={() => markRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
