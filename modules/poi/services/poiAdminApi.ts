export async function fetchPoiStats(): Promise<{ activePois: number }> {
  const res = await fetch("/api/poi/admin/stats", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch POI stats");
  const json = await res.json();
  return json.data as { activePois: number };
}
