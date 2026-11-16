import { test } from "node:test";
import assert from "node:assert/strict";
import { archiveSequentially, type ArchiveProgress } from "../shared/bulk-archive.ts";

test("archives all in order", async () => {
  const calls: string[] = [];
  const out = await archiveSequentially(["a", "b", "c"], async (id) => {
    calls.push(id);
  });
  assert.deepEqual(calls, ["a", "b", "c"]);
  assert.deepEqual(out.archived, ["a", "b", "c"]);
  assert.deepEqual(out.failed, []);
});

test("never runs two archives at once", async () => {
  let inFlight = 0;
  let max = 0;
  await archiveSequentially(["a", "b", "c"], async () => {
    inFlight++;
    max = Math.max(max, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
  });
  assert.equal(max, 1);
});

test("continues after a failure", async () => {
  const out = await archiveSequentially(["a", "b", "c"], async (id) => {
    if (id === "b") throw new Error("gone");
  });
  assert.deepEqual(out.archived, ["a", "c"]);
  assert.deepEqual(out.failed, [{ id: "b", error: "gone" }]);
});

test("stringifies non-Error rejections", async () => {
  const out = await archiveSequentially(["a"], async () => {
    throw "boom";
  });
  assert.deepEqual(out.failed, [{ id: "a", error: "boom" }]);
});

test("reports progress", async () => {
  const events: ArchiveProgress[] = [];
  await archiveSequentially(["a", "b", "c"], async () => {}, (p) => events.push({ ...p }));
  assert.deepEqual(events[0], { done: 0, total: 3, currentId: "a" });
  assert.deepEqual(events[events.length - 1], { done: 3, total: 3, currentId: null });
});

test("empty list", async () => {
  let called = false;
  const out = await archiveSequentially([], async () => {
    called = true;
  });
  assert.deepEqual(out, { archived: [], failed: [] });
  assert.equal(called, false);
});
