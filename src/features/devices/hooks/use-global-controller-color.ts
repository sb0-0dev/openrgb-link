import { useCallback, useRef, useState } from "react";

import { setControllerColor } from "@/features/devices/api";
import { OpenRgbController } from "@/features/devices/types";
import { OpenRgbClient } from "@/services/openrgb/client";

/**
 * Converts a six-digit picker color to the OpenRGB RGB payload shape.
 * @param hex Picker-produced color string.
 * @returns Integer `r`, `g`, and `b` channels.
 */
function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.replace(/^#/, ""), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

/**
 * Applies the latest selected color to every controller and gathers failures.
 * While a batch is running, later selections replace the queued color.
 * @param options Server credentials and the current controller list.
 * @returns Batch action, progress state, and a joined error for failed devices.
 */
export function useGlobalControllerColor({
  baseUrl,
  accessToken,
  controllers,
}: {
  baseUrl: string;
  accessToken: string;
  controllers: OpenRgbController[];
}) {
  const [isApplyingColor, setIsApplyingColor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingColor = useRef<string | null>(null);
  const isSending = useRef(false);

  /**
   * Queues a batch update; while one batch is in flight, keeps only the latest color.
   * @param hex CSS hex color selected by the user.
   * @returns Resolves after the latest queued batch settles; per-device failures
   *   are reported through the returned `error` state.
   */
  const applyColorToAllControllers = useCallback(
    async (hex: string) => {
      pendingColor.current = hex;
      if (isSending.current) return;
      isSending.current = true;
      setIsApplyingColor(true);
      try {
        while (pendingColor.current) {
          const nextColor = pendingColor.current;
          pendingColor.current = null;
          setError(null);
          const client = new OpenRgbClient({ baseUrl, accessToken });
          const results = await Promise.allSettled(
            controllers.map((controller) =>
              setControllerColor(client, controller.id, hexToRgb(nextColor)),
            ),
          );
          const failures = results.flatMap((result, index) =>
            result.status === "rejected"
              ? [`${controllers[index]?.name ?? "Controller"}: ${result.reason instanceof Error ? result.reason.message : "Could not update color."}`]
              : [],
          );
          setError(failures.length ? failures.join("; ") : null);
        }
      } finally {
        isSending.current = false;
        setIsApplyingColor(false);
      }
    },
    [accessToken, baseUrl, controllers],
  );

  return { applyColorToAllControllers, isApplyingColor, error };
}
