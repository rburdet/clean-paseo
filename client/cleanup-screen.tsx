import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { usePaseo } from "@getpaseo/plugin/client";
import { FlatList, Icon, Modal, useToast } from "@getpaseo/plugin/client/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { archiveSequentially } from "../shared/bulk-archive.ts";
import type { ArchiveProgress } from "../shared/bulk-archive.ts";
import { fetchAllWorkspaces } from "../shared/fetch-all.ts";
import { formatActivity, pruneSelection, sortRows, toRow } from "../shared/rows.ts";
import type { SortDirection, WorkspaceRow } from "../shared/rows.ts";

interface Failure {
  id: string;
  label: string;
  error: string;
}

export function CleanupScreen({ theme, layout }: PluginScreenProps) {
  const paseo = usePaseo();
  const toast = useToast();
  const [dir, setDir] = useState<SortDirection>("oldest-first");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<ArchiveProgress | null>(null);
  const [failures, setFailures] = useState<Failure[]>([]);
  const runningRef = useRef(false);

  const query = useQuery({
    queryKey: ["clean-paseo", "workspaces"],
    queryFn: () => fetchAllWorkspaces((o) => paseo.workspaces.list(o)),
  });

  const rows = useMemo(() => sortRows((query.data ?? []).map(toRow), dir), [query.data, dir]);
  const selectable = useMemo(() => rows.filter((r) => !r.archiving), [rows]);
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id) && !r.archiving), [rows, selected]);
  const n = selectedRows.length;
  const running = progress !== null;
  const allSelected = selectable.length > 0 && n === selectable.length;
  const riskyCount = selectedRows.filter((r) => r.risky).length;

  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        padding: layout.compact ? 16 : 24,
        backgroundColor: theme.colors.surface0,
        gap: 12,
      },
      header: { gap: 8 },
      headerRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, alignItems: "center" as const, gap: 8 },
      title: { color: theme.colors.foreground, fontSize: 16, fontWeight: "600" as const },
      text: { color: theme.colors.foreground },
      muted: { color: theme.colors.foregroundMuted, fontSize: 12 },
      warning: { color: theme.colors.statusWarning },
      danger: { color: theme.colors.statusDanger },
      secondaryButton: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.border },
      primaryButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: theme.colors.accent },
      primaryText: { color: theme.colors.accentForeground },
      disabled: { opacity: 0.4 },
      row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      },
      rowBody: { flex: 1, gap: 2 },
      rowMeta: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
      dimmed: { opacity: 0.4 },
      modalBody: { gap: 8 },
    }),
    [theme, layout.compact],
  );

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)));
  }

  async function runArchive() {
    if (runningRef.current || n === 0) return;
    runningRef.current = true;
    setConfirmOpen(false);
    const targets = selectedRows;
    const labels = new Map(targets.map((r) => [r.id, r.label]));
    setFailures([]);
    setProgress({ done: 0, total: targets.length, currentId: null });
    try {
      const outcome = await archiveSequentially(
        targets.map((r) => r.id),
        async (id) => {
          // workspaces.archive resolves with an `error` field instead of throwing.
          const result = await paseo.workspaces.archive(id);
          if (result.error) throw new Error(result.error);
          return result;
        },
        setProgress,
      );
      toast.show(`Archivados ${outcome.archived.length}`);
      setFailures(
        outcome.failed.map((f) => ({ id: f.id, label: labels.get(f.id) ?? f.id, error: f.error })),
      );
      const refreshed = await query.refetch();
      const fresh = (refreshed.data ?? []).map(toRow);
      setSelected((s) => pruneSelection(s, fresh));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      runningRef.current = false;
      setProgress(null);
    }
  }

  function renderRow({ item }: { item: WorkspaceRow }) {
    const isSelected = selected.has(item.id) && !item.archiving;
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected, disabled: item.archiving }}
        disabled={item.archiving}
        onPress={() => toggleOne(item.id)}
        style={[styles.row, item.archiving ? styles.dimmed : null]}
      >
        <Icon
          name={isSelected ? "SquareCheck" : "Square"}
          size={18}
          color={theme.colors.foreground}
        />
        <View style={styles.rowBody}>
          <Text style={styles.text}>
            {item.risky ? <Text style={styles.warning}>⚠ </Text> : null}
            {item.label}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={styles.muted}>{item.project}</Text>
            <Text style={styles.muted}>{formatActivity(item.activityMs, Date.now())}</Text>
            <Text style={styles.muted}>{item.archiving ? "archivando" : item.status}</Text>
            {item.diff ? (
              <Text style={styles.muted}>{`+${item.diff.additions} −${item.diff.deletions}`}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{`${rows.length} workspaces activos`}</Text>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            style={styles.secondaryButton}
            onPress={() => setDir((d) => (d === "oldest-first" ? "newest-first" : "oldest-first"))}
          >
            <Text style={styles.text}>
              {dir === "oldest-first" ? "Más viejos primero" : "Más recientes primero"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={running || selectable.length === 0}
            style={[styles.secondaryButton, running || selectable.length === 0 ? styles.disabled : null]}
            onPress={toggleAll}
          >
            <Text style={styles.text}>{allSelected ? "Deseleccionar todos" : "Seleccionar todos"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: n === 0 || running }}
            disabled={n === 0 || running}
            style={[styles.primaryButton, n === 0 || running ? styles.disabled : null]}
            onPress={() => setConfirmOpen(true)}
          >
            <Text style={styles.primaryText}>{`Archivar ${n}`}</Text>
          </Pressable>
        </View>
        {progress ? <Text style={styles.text}>{`Archivando ${Math.min(progress.done + 1, progress.total)}/${progress.total}…`}</Text> : null}
        {query.isError ? (
          <Text style={styles.danger}>
            {`No se pudo cargar: ${query.error instanceof Error ? query.error.message : String(query.error)}`}
          </Text>
        ) : null}
        {failures.length > 0 ? (
          <View>
            <Text style={styles.danger}>{`No se pudieron archivar ${failures.length}:`}</Text>
            {failures.map((f) => (
              <Text key={f.id} style={styles.danger}>{`${f.label}: ${f.error}`}</Text>
            ))}
          </View>
        ) : null}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={renderRow}
        extraData={selected}
        ListEmptyComponent={
          <Text style={styles.muted}>{query.isLoading ? "Cargando…" : "No hay workspaces."}</Text>
        }
      />
      <Modal title={`¿Archivar ${n} workspaces?`} open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Modal.Content>
          <View style={styles.modalBody}>
            {selectedRows.map((r) => (
              <Text key={r.id} style={styles.text}>{`• ${r.label}`}</Text>
            ))}
            {riskyCount > 0 ? (
              <Text style={styles.warning}>{`⚠ ${riskyCount} tienen un agente activo`}</Text>
            ) : null}
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={() => setConfirmOpen(false)}
              >
                <Text style={styles.text}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={running || n === 0}
                style={[styles.primaryButton, running || n === 0 ? styles.disabled : null]}
                onPress={() => void runArchive()}
              >
                <Text style={styles.primaryText}>Archivar</Text>
              </Pressable>
            </View>
          </View>
        </Modal.Content>
      </Modal>
    </View>
  );
}
