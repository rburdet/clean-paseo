import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAllWorkspaces, type ListFn } from "../shared/fetch-all.ts";

type Opts = Parameters<ListFn<string>>[0];

test("single page", async () => {
  const calls: Opts[] = [];
  const list: ListFn<string> = async (o) => {
    calls.push(o);
    return { entries: ["a", "b", "c"], pageInfo: { nextCursor: null, hasMore: false } };
  };
  const out = await fetchAllWorkspaces(list);
  assert.deepEqual(out, ["a", "b", "c"]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].page.limit, 100);
  assert.equal(calls[0].page.cursor, undefined);
});

test("follows cursors", async () => {
  const calls: Opts[] = [];
  const pages = [
    { entries: ["a", "b"], pageInfo: { nextCursor: "c1", hasMore: true } },
    { entries: ["c"], pageInfo: { nextCursor: "c2", hasMore: true } },
    { entries: ["d"], pageInfo: { nextCursor: null, hasMore: false } },
  ];
  const list: ListFn<string> = async (o) => {
    calls.push(o);
    return pages[calls.length - 1];
  };
  const out = await fetchAllWorkspaces(list);
  assert.deepEqual(out, ["a", "b", "c", "d"]);
  assert.equal(calls[1].page.cursor, "c1");
  assert.equal(calls[2].page.cursor, "c2");
});

test("stops at 50 pages on a cursor loop", async () => {
  let n = 0;
  const list: ListFn<string> = async () => {
    n++;
    return { entries: ["x"], pageInfo: { nextCursor: "same", hasMore: true } };
  };
  const out = await fetchAllWorkspaces(list);
  assert.equal(n, 50);
  assert.equal(out.length, 50);
});
