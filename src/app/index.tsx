import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { PairingModal } from "@/features/connection/components/pairing-modal";
import { useServerConnection } from "@/features/connection/hooks/use-server-connection";
import { useDevices } from "@/features/devices/hooks/use-devices";
import { OpenRgbController } from "@/features/devices/types";
import { ServerProfileList } from "@/features/connection/components/server-profile-list";
import { ActiveServerView } from "@/features/home/components/active-server-view";
import { HomeHeader } from "@/features/home/components/home-header";
import { styles } from "@/features/home/styles";
import { useThemeMode } from "@/hooks/use-theme";
import { getApiUpgradeMessage } from "@/features/connection/version";

/** Root route that coordinates pairing, server selection, and the active server. */
export default function HomeScreen() {
  const { mode, setMode } = useThemeMode();
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [activeServerTab, setActiveServerTab] = useState<
    "controllers" | "effects" | "profiles"
  >("controllers");
  const [selectedController, setSelectedController] =
    useState<OpenRgbController | null>(null);
  const [isModeEditorOpen, setIsModeEditorOpen] = useState(false);
  const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);
  const {
    profiles,
    statuses,
    isLoading: isLoadingProfiles,
    activeProfile,
    activeAccessToken,
    activeServerVersion,
    addProfile,
    disconnect,
    connectingId,
    connectionError,
    compatibilityError,
    setConnectionError,
    confirmRemoveId,
    setConfirmRemoveId,
    connect,
    removeProfile: confirmRemove,
  } = useServerConnection(() => {
    setActiveServerTab("controllers");
    setSelectedController(null);
    setIsModeEditorOpen(false);
    setIsZoneEditorOpen(false);
  });

  const devices = useDevices(
    activeProfile?.baseUrl ?? "",
    activeAccessToken ?? undefined,
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <HomeHeader
          activeProfile={activeProfile}
          activeTab={activeServerTab}
          selectedController={selectedController}
          isModeEditorOpen={isModeEditorOpen}
          isZoneEditorOpen={isZoneEditorOpen}
          mode={mode}
          onBackToControllers={() => {
            devices.refresh();
            setSelectedController(null);
          }}
          onBackToControllerSettings={() => {
            setIsModeEditorOpen(false);
            setIsZoneEditorOpen(false);
          }}
          onDisconnect={() => {
            disconnect();
            setIsModeEditorOpen(false);
            setIsZoneEditorOpen(false);
            setConnectionError(null);
          }}
          onToggleTheme={() => setMode(mode === "dark" ? "light" : "dark")}
          onAddServer={() => setIsPairingOpen(true)}
        />

        {activeProfile ? (
          <ActiveServerView
            baseUrl={activeProfile.baseUrl}
            accessToken={activeAccessToken ?? ""}
            devices={devices}
            error={connectionError}
            serverVersion={activeServerVersion}
            upgradeMessage={activeServerVersion ? getApiUpgradeMessage(activeServerVersion) : null}
            activeTab={activeServerTab}
            onActiveTabChange={setActiveServerTab}
            selectedController={selectedController}
            onSelectedControllerChange={setSelectedController}
            isModeEditorOpen={isModeEditorOpen}
            onModeEditorOpenChange={setIsModeEditorOpen}
            isZoneEditorOpen={isZoneEditorOpen}
            onZoneEditorOpenChange={setIsZoneEditorOpen}
          />
        ) : (
          <ServerProfileList
            profiles={profiles}
            statuses={statuses}
            isLoading={isLoadingProfiles}
            connectingId={connectingId}
            confirmRemoveId={confirmRemoveId}
            connectionError={connectionError}
            compatibilityError={compatibilityError}
            onConnect={connect}
            onRemoveRequest={setConfirmRemoveId}
            onRemoveConfirm={confirmRemove}
            onCancelRemove={() => setConfirmRemoveId(null)}
            onAddFirst={() => setIsPairingOpen(true)}
          />
        )}
      </SafeAreaView>

      <PairingModal
        visible={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        onAdd={addProfile}
      />
    </ThemedView>
  );
}
