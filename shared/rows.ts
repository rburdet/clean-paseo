export type WorkspaceStatus = "running" | "attention" | "needs_input" | "failed" | "done";

export interface WorkspaceInput {
  id: string;
  name: string;
  title?: string | null;
  projectDisplayName: string;
  status: WorkspaceStatus;
  activityAt: string | null;
  archivingAt?: string | null;
  diffStat?: { additions: number; deletions: number } | null;
}

export interface WorkspaceRow {
  id: string;
  label: string;
  project: string;
  status: WorkspaceStatus;
  activityMs: number | null;
  risky: boolean;
  archiving: boolean;
  diff: { additions: number; deletions: number } | null;
}

export type SortDirection = "oldest-first" | "newest-first";

export function toRow(w: WorkspaceInput): WorkspaceRow {
  const parsed = w.activityAt == null ? Number.NaN : Date.parse(w.activityAt);
  return {
    id: w.id,
    label: w.title ? w.title : w.name,
    project: w.projectDisplayName,
    status: w.status,
    activityMs: Number.isNaN(parsed) ? null : parsed,
    risky: w.status === "running" || w.status === "needs_input",
    archiving: w.archivingAt != null,
    diff: w.diffStat ?? null,
  };
}

export function sortRows(rows: WorkspaceRow[], dir: SortDirection): WorkspaceRow[] {
  const sign = dir === "oldest-first" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const am = a.activityMs ?? Number.NEGATIVE_INFINITY;
    const bm = b.activityMs ?? Number.NEGATIVE_INFINITY;
    if (am === bm) return 0;
    return am < bm ? -sign : sign;
  });
}

export function formatActivity(activityMs: number | null, nowMs: number): string {
  if (activityMs === null) return "sin actividad";
  const seconds = Math.floor((nowMs - activityMs) / 1000);
  if (seconds < 60) return "recién";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

export function pruneSelection(selected: ReadonlySet<string>, rows: WorkspaceRow[]): Set<string> {
  const keep = new Set<string>();
  for (const r of rows) {
    if (selected.has(r.id) && !r.archiving) keep.add(r.id);
  }
  return keep;
}
