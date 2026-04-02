export async function fetchActiveVendorCount(): Promise<number> {
  const res = await fetch("/api/user/admin/stats", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch vendor stats");
  const json = await res.json();
  return json.data?.activeVendors ?? 0;
}
