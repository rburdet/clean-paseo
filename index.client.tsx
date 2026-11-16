import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { CleanupScreen } from "./client/cleanup-screen.tsx";

function CleanupItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="Trash2"
      active={currentScreen?.screenId === "cleanup"}
      onPress={() => openScreen({ screenId: "cleanup" })}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  const removeScreen = client.addScreen({ id: "cleanup", title: "Limpiar workspaces", Component: CleanupScreen });
  const removeItem = client.addSidebarHeaderItem({ id: "cleanup", title: "Limpiar workspaces", Component: CleanupItem });
  return () => {
    removeScreen();
    removeItem();
  };
}
