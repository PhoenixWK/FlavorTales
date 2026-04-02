export interface VisitorStatPoint {
  label: string;
  count: number;
}

export type VisitorPeriod = "day" | "week" | "month" | "year";

export async function fetchVisitorStats(period: VisitorPeriod): Promise<VisitorStatPoint[]> {
  const res = await fetch(`/api/analytics/admin/visitors/stats?period=${period}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch visitor stats");
  const json = await res.json();
  return json.data as VisitorStatPoint[];
}

export async function fetchActiveVisitorCount(): Promise<number> {
  const res = await fetch("/api/tourist/sessions/active/count", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch active visitor count");
  const json = await res.json();
  return json.data as number;
}
