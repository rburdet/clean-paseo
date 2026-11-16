export interface ListPage<T> {
  entries: T[];
  pageInfo: { nextCursor: string | null; hasMore: boolean };
}

export type ListFn<T> = (opts: {
  sort: { key: "activity_at"; direction: "asc" }[];
  page: { limit: number; cursor?: string };
}) => Promise<ListPage<T>>;

const MAX_PAGES = 50;

export async function fetchAllWorkspaces<T>(list: ListFn<T>, pageSize = 100): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await list({
      sort: [{ key: "activity_at", direction: "asc" }],
      page: cursor === undefined ? { limit: pageSize } : { limit: pageSize, cursor },
    });
    all.push(...page.entries);
    if (!page.pageInfo.hasMore || !page.pageInfo.nextCursor) break;
    cursor = page.pageInfo.nextCursor;
  }
  return all;
}
