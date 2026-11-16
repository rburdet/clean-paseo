export type WorkspaceStatus = "running" | "attention" | "needs_input" | "failed" | "done";

export interface WorkspaceInput {
  id: string;
  name: string;
  title?: string | null;
  projectDisplayName: string;
  status: WorkspaceStatus;
  activityAt: string | null;
  lastUserMessageAt?: string | null;
  statusEnteredAt?: string | null;
  createdAt?: string;
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

// Paseo 0.15.0 always sends activityAt: null in workspace lists, so take the
// latest of every timestamp the daemon does fill in.
function latestActivityMs(w: WorkspaceInput): number | null {
  let latest: number | null = null;
  for (const iso of [w.activityAt, w.lastUserMessageAt, w.statusEnteredAt, w.createdAt]) {
    if (iso == null) continue;
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms) && (latest === null || ms > latest)) latest = ms;
  }
  return latest;
}

export function toRow(w: WorkspaceInput): WorkspaceRow {
  return {
    id: w.id,
    label: w.title ? w.title : w.name,
    project: w.projectDisplayName,
    status: w.status,
    activityMs: latestActivityMs(w),
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
  if (activityMs === null) return "no activity";
  const seconds = Math.floor((nowMs - activityMs) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function pruneSelection(selected: ReadonlySet<string>, rows: WorkspaceRow[]): Set<string> {
  const keep = new Set<string>();
  for (const r of rows) {
    if (selected.has(r.id) && !r.archiving) keep.add(r.id);
  }
  return keep;
}

export function dedupeById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}
