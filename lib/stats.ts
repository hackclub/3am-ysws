type YswsEntry = {
  id: string;
  ysws: string;
  approved_at: number | null;
  hours: number | null;
};

export async function getYswsStats() {
  const res = await fetch("https://ships.hackclub.com/api/v1/ysws_entries", {
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`Ships API error: ${res.status}`);
  const entries: YswsEntry[] = await res.json();

  const ours = entries.filter(
    (e) => e.ysws === "3am" && e.approved_at != null
  );

  const totalProjects = ours.length;
  const totalHours = Math.round(
    ours.reduce((sum, e) => sum + (e.hours || 0), 0)
  );

  return { totalProjects, totalHours };
}
