import type { usePaseo } from "@getpaseo/plugin/client";
import type { PaseoWorkspace } from "@getpaseo/client";
import type { ListFn } from "../shared/fetch-all.ts";

declare const paseo: ReturnType<typeof usePaseo>;
// Type-only check: the screen passes this lambda to fetchAllWorkspaces.
export const _check: ListFn<PaseoWorkspace> = (o) => paseo.workspaces.list(o);
