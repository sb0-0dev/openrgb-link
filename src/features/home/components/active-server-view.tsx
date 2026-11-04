import { useEffect, useState } from "react";
import { View } from "react-native";
import { ThemedText } from "@/components/themed-text";

import { ControllerDetails } from "@/features/devices/components/controller-details";
import { ControllerList } from "@/features/devices/components/controller-list";
import { ModeEditor } from "@/features/devices/components/mode-editor";
import { ZoneEditor } from "@/features/devices/components/zone-editor";
import { useDevices } from "@/features/devices/hooks/use-devices";
import { OpenRgbController } from "@/features/devices/types";
import { ServerEffectsMenu } from "@/features/effects/components/server-effects-menu";
import { LightingProfilesMenu } from "@/features/profiles/components/lighting-profiles-menu";
import { ServerTabNavigation } from "@/features/home/components/server-tab-navigation";
import type { ServerVersion } from "@/features/connection/api";
import { styles } from "@/features/home/styles";

/**
 * Renders the active server tab and the selected controller's editor view.
 * @param props Connection details, tab/controller state, and navigation callbacks.
 * @returns Active tab content and persistent server tab navigation.
 */
export function ActiveServerView({
  baseUrl,
  accessToken,
  devices,
  error,
  serverVersion,
  upgradeMessage,
  activeTab,
  onActiveTabChange,
  selectedController,
  onSelectedControllerChange,
  isModeEditorOpen,
  onModeEditorOpenChange,
  isZoneEditorOpen,
  onZoneEditorOpenChange,
}: {
  baseUrl: string;
  accessToken: string;
  devices: ReturnType<typeof useDevices>;
  error: string | null;
  serverVersion: ServerVersion | null;
  upgradeMessage: string | null;
  activeTab: "controllers" | "effects" | "profiles";
  onActiveTabChange: (tab: "controllers" | "effects" | "profiles") => void;
  selectedController: OpenRgbController | null;
  onSelectedControllerChange: (controller: OpenRgbController | null) => void;
  /** Shared with the app header so its back action changes the visible screen. */
  isModeEditorOpen: boolean;
  onModeEditorOpenChange: (isOpen: boolean) => void;
  isZoneEditorOpen: boolean;
  onZoneEditorOpenChange: (isOpen: boolean) => void;
}) {
  const [colorControllerId, setColorControllerId] = useState<number | null>(
    null,
  );
  const [isGlobalColorPickerOpen, setIsGlobalColorPickerOpen] = useState(false);

  function selectTab(tab: "controllers" | "effects" | "profiles") {
    onActiveTabChange(tab);
    onSelectedControllerChange(null);
    onZoneEditorOpenChange(false);
    onModeEditorOpenChange(false);
    setColorControllerId(null);
    setIsGlobalColorPickerOpen(false);
  }

  function selectController(controller: OpenRgbController) {
    onSelectedControllerChange(controller);
    onZoneEditorOpenChange(false);
    onModeEditorOpenChange(false);
    setColorControllerId(null);
    setIsGlobalColorPickerOpen(false);
  }

  useEffect(() => {
    if (activeTab === "controllers") {
      devices.refresh();
    }
  }, [activeTab, devices.refresh]);

  useEffect(() => {
    if (
      activeTab !== "controllers" ||
      !selectedController ||
      devices.isLoading ||
      devices.error
    ) {
      return;
    }

    const currentController = devices.controllers.find(
      (controller) => controller.id === selectedController.id,
    );

    if (!currentController) {
      onSelectedControllerChange(null);
      onZoneEditorOpenChange(false);
      onModeEditorOpenChange(false);
      setColorControllerId(null);
      return;
    }

    if (currentController !== selectedController) {
      onSelectedControllerChange(currentController);
    }
  }, [
    activeTab,
    devices.controllers,
    devices.error,
    devices.isLoading,
    onModeEditorOpenChange,
    onSelectedControllerChange,
    onZoneEditorOpenChange,
    selectedController,
  ]);

  return (
    <View style={styles.activeServer}>
      {upgradeMessage ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <ThemedText type="small" themeColor="textSecondary">{upgradeMessage}</ThemedText>
        </View>
      ) : null}
      <View style={styles.activeServerContent}>
        {activeTab === "controllers" ? (
          selectedController ? (
            isModeEditorOpen ? (
              <ModeEditor
                key={`${baseUrl}-${selectedController.id}-modes`}
                baseUrl={baseUrl}
                accessToken={accessToken}
                controllerId={selectedController.id}
              />
            ) : isZoneEditorOpen ? (
              <ZoneEditor
                key={`${baseUrl}-${selectedController.id}-zones`}
                baseUrl={baseUrl}
                accessToken={accessToken}
                controllerId={selectedController.id}
              />
            ) : (
              <ControllerDetails
                controller={selectedController}
                onColor={() => setColorControllerId(selectedController.id)}
                onCloseColor={() => setColorControllerId(null)}
                onZones={() => onZoneEditorOpenChange(true)}
                onModes={() => {
                  onModeEditorOpenChange(true);
                }}
                baseUrl={baseUrl}
                accessToken={accessToken}
                colorOpen={colorControllerId === selectedController.id}
              />
            )
          ) : (
            <ControllerList
              baseUrl={baseUrl}
              accessToken={accessToken}
              devices={devices}
              error={error}
              colorControllerId={colorControllerId}
              onColorControllerChange={setColorControllerId}
              isGlobalColorPickerOpen={isGlobalColorPickerOpen}
              onGlobalPickerToggle={() => {
                setIsGlobalColorPickerOpen((open) => !open);
                setColorControllerId(null);
              }}
              onGlobalPickerClose={() => setIsGlobalColorPickerOpen(false)}
              onSelectController={selectController}
            />
          )
        ) : activeTab === "effects" ? (
          <ServerEffectsMenu baseUrl={baseUrl} accessToken={accessToken} />
        ) : (
          <LightingProfilesMenu baseUrl={baseUrl} accessToken={accessToken} />
        )}
      </View>

      <ServerTabNavigation activeTab={activeTab} onSelect={selectTab} features={serverVersion?.features ?? ["controllers"]} />
    </View>
  );
}

