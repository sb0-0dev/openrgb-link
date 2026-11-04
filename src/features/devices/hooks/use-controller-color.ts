import { useEffect, useRef, useState } from "react";

import { listControllerLeds, setControllerColor } from "@/features/devices/api";
import { averageColorHex } from "@/features/devices/color-utils";
import { OpenRgbClient } from "@/services/openrgb/client";

/**
 * Converts three- or six-digit CSS hex notation to API RGB channels.
 * @param hex CSS hex color, with or without a leading `#`.
 * @returns Integer `r`, `g`, and `b` channels.
 */
function hexToRgb(hex: string) {
  const normalized = hex.replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((digit) => `${digit}${digit}`)
          .join("")
      : normalized;
  const value = Number.parseInt(expanded, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

/**
 * Reads and updates one controller's color. Rapid picker changes are coalesced
 * so only one request is in flight while the latest selected color is retained.
 * @param baseUrl Connected server API address.
 * @param accessToken Bearer token for the paired device.
 * @param controllerId OpenRGB controller identifier.
 * @param enabled Set false to skip the initial LED color lookup.
 * @returns Current hex color, request state, latest error, and color setter.
 */
export function useControllerColor(
  baseUrl: string,
  accessToken: string,
  controllerId: number,
  enabled = true,
) {
  const [color, setColor] = useState("#FFFFFF");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingColor = useRef<string | null>(null);
  const isSendingRef = useRef(false);
  const hasUserChangedColor = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let isCurrent = true;
    listControllerLeds(
      new OpenRgbClient({ baseUrl, accessToken }),
      controllerId,
    )
      .then((leds) => {
        if (isCurrent && !hasUserChangedColor.current) {
          setColor(averageColorHex(leds.map((led) => led.color)));
        }
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [accessToken, baseUrl, controllerId, enabled]);

  /** Drains the color queue until the most recently selected value is sent. */
  async function sendPendingColor() {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);

    // Drain to the latest value instead of starting overlapping color requests.
    while (pendingColor.current) {
      const nextColor = pendingColor.current;
      pendingColor.current = null;
      try {
        await setControllerColor(
          new OpenRgbClient({ baseUrl, accessToken }),
          controllerId,
          hexToRgb(nextColor),
        );
        setError(null);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not update controller color.",
        );
      }
    }

    isSendingRef.current = false;
    setIsSending(false);
  }

  /**
   * Updates the picker immediately and queues the corresponding server update.
   * @param nextColor New CSS hex color from the picker.
   */
  function changeColor(nextColor: string) {
    hasUserChangedColor.current = true;
    setColor(nextColor);
    setError(null);
    pendingColor.current = nextColor;
    void sendPendingColor();
  }

  return { color, isSending, error, changeColor };
}
