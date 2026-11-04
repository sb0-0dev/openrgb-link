import { useEffect, useState } from "react";

import { listEffects, setEffect } from "@/features/effects/api";
import { OpenRgbEffect } from "@/features/effects/types";
import { OpenRgbClient } from "@/services/openrgb/client";

/**
 * Loads server effects and prevents overlapping UI updates while one toggle runs.
 * @param baseUrl Connected server API address.
 * @param accessToken Bearer token for the paired device.
 * @returns Effect lists, loading/error/update state, toggle action, and refresh.
 */
export function useServerEffects(baseUrl: string, accessToken: string) {
  const [effects, setEffects] = useState<OpenRgbEffect[]>([]);
  const [activeEffects, setActiveEffects] = useState<OpenRgbEffect[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestKey = JSON.stringify([baseUrl, accessToken, refreshVersion]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    listEffects(new OpenRgbClient({ baseUrl, accessToken }))
      .then((result) => {
        if (isCurrent) {
          setEffects(result.effects);
          setActiveEffects(result.enabledEffects);
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load effects.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setLoadedKey(requestKey);
      });

    return () => {
      isCurrent = false;
    };
  }, [accessToken, baseUrl, refreshVersion, requestKey]);

  /**
   * Changes one effect and updates local active state only after server success.
   * @param effect Server-provided effect identifier.
   * @param enable Whether the effect should be active.
   */
  async function setEnabled(effect: OpenRgbEffect, enable: boolean) {
    setIsUpdating(effect);
    setError(null);
    try {
      await setEffect(
        new OpenRgbClient({ baseUrl, accessToken }),
        effect,
        enable,
      );
      setActiveEffects((current) =>
        enable
          ? current.includes(effect)
            ? current
            : [...current, effect]
          : current.filter((activeEffect) => activeEffect !== effect),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update effect.",
      );
    } finally {
      setIsUpdating(null);
    }
  }

  return {
    effects,
    activeEffects,
    isLoading: loadedKey !== requestKey,
    isUpdating,
    error,
    setEnabled,
    refresh: () => setRefreshVersion((version) => version + 1),
  };
}
