import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeById,
  formatActivity,
  pruneSelection,
  sortRows,
  toRow,
  type WorkspaceInput,
  type WorkspaceRow,
  type WorkspaceStatus,
} from "../shared/rows.ts";

function input(overrides: Partial<WorkspaceInput> = {}): WorkspaceInput {
  return {
    id: "w1",
    name: "ws-name",
    title: null,
    projectDisplayName: "proj",
    status: "done",
    activityAt: null,
    ...overrides,
  };
}

function row(id: string, activityMs: number | null, archiving = false): WorkspaceRow {
  return {
    id,
    label: id,
    project: "p",
    status: "done",
    activityMs,
    risky: false,
    archiving,
    diff: null,
  };
}

test("toRow uses title, falls back to name", () => {
  assert.equal(toRow(input({ title: "" })).label, "ws-name");
  assert.equal(toRow(input({ title: "X" })).label, "X");
});

test("toRow flags risky for running and needs_input only", () => {
  const risky = (status: WorkspaceStatus) => toRow(input({ status })).risky;
  assert.equal(risky("running"), true);
  assert.equal(risky("needs_input"), true);
  assert.equal(risky("done"), false);
  assert.equal(risky("attention"), false);
  assert.equal(risky("failed"), false);
});

test("toRow treats unparsable activityAt as null", () => {
  assert.equal(toRow(input({ activityAt: "garbage" })).activityMs, null);
  assert.equal(toRow(input({ activityAt: null })).activityMs, null);
  assert.equal(toRow(input({ activityAt: "2026-01-01T00:00:00.000Z" })).activityMs, Date.parse("2026-01-01T00:00:00.000Z"));
});

test("sortRows oldest-first puts null first, then ascending", () => {
  const rows = [row("a", 300), row("b", null), row("c", 100)];
  assert.deepEqual(sortRows(rows, "oldest-first").map((r) => r.activityMs), [null, 100, 300]);
  assert.deepEqual(sortRows(rows, "newest-first").map((r) => r.activityMs), [300, 100, null]);
  assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c"]);
});

test("formatActivity buckets", () => {
  const now = 1_000_000_000;
  assert.equal(formatActivity(null, now), "no activity");
  assert.equal(formatActivity(now - 30_000, now), "just now");
  assert.equal(formatActivity(now - 5 * 60_000, now), "5 min ago");
  assert.equal(formatActivity(now - 3 * 3_600_000, now), "3 h ago");
  assert.equal(formatActivity(now - 50 * 3_600_000, now), "2 d ago");
});

test("pruneSelection drops missing and archiving ids", () => {
  const result = pruneSelection(new Set(["a", "b", "c"]), [row("a", 1), row("b", 2, true)]);
  assert.deepEqual([...result], ["a"]);
});

test("dedupeById keeps first occurrence and order", () => {
  const out = dedupeById([{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "a", v: 3 }]);
  assert.deepEqual(out, [{ id: "a", v: 1 }, { id: "b", v: 2 }]);
});

test("toRow derives activity from the latest known timestamp", () => {
  // Paseo 0.15.0 always sends activityAt: null in workspace lists.
  const r = toRow(
    input({
      activityAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      statusEnteredAt: "2026-01-03T00:00:00.000Z",
      lastUserMessageAt: "2026-01-02T00:00:00.000Z",
    }),
  );
  assert.equal(r.activityMs, Date.parse("2026-01-03T00:00:00.000Z"));
});

test("toRow falls back to createdAt and ignores garbage timestamps", () => {
  const r = toRow(input({ createdAt: "2026-01-01T00:00:00.000Z", lastUserMessageAt: "garbage" }));
  assert.equal(r.activityMs, Date.parse("2026-01-01T00:00:00.000Z"));
});
