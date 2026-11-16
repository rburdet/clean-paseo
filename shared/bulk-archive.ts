export interface ArchiveProgress {
  done: number;
  total: number;
  currentId: string | null;
}

export interface ArchiveOutcome {
  archived: string[];
  failed: { id: string; error: string }[];
}

export async function archiveSequentially(
  ids: string[],
  archive: (id: string) => Promise<unknown>,
  onProgress?: (p: ArchiveProgress) => void,
): Promise<ArchiveOutcome> {
  const outcome: ArchiveOutcome = { archived: [], failed: [] };
  const total = ids.length;
  let done = 0;
  for (const id of ids) {
    onProgress?.({ done, total, currentId: id });
    try {
      await archive(id);
      outcome.archived.push(id);
    } catch (err) {
      outcome.failed.push({ id, error: err instanceof Error ? err.message : String(err) });
    }
    done++;
  }
  onProgress?.({ done, total, currentId: null });
  return outcome;
}
