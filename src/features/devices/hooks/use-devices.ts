import { useCallback, useEffect, useState } from "react";

import { listControllers } from "@/features/devices/api";
import { OpenRgbController } from "@/features/devices/types";
import { OpenRgbClient } from "@/services/openrgb/client";

type DeviceResult = {
  key: string;
  controllers: OpenRgbController[];
  error: string | null;
};

/**
 * Loads controllers for the current server and exposes a refresh action.
 * Results from a previous URL/token/refresh request are hidden until current.
 * @param baseUrl Connected server API address.
 * @param accessToken Optional bearer token for authenticated requests.
 * @returns Controllers, loading/error state, and a function to reload them.
 */
export function useDevices(baseUrl: string, accessToken?: string) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [result, setResult] = useState<DeviceResult | null>(null);
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  // Only expose results belonging to this server/token/refresh generation.
  const requestKey = JSON.stringify([
    normalizedBaseUrl,
    accessToken,
    refreshVersion,
  ]);

  useEffect(() => {
    if (!normalizedBaseUrl) {
      return;
    }

    const controller = new AbortController();
    const client = new OpenRgbClient({
      baseUrl: normalizedBaseUrl,
      accessToken,
    });

    listControllers(client, controller.signal)
      .then((controllers) => {
        setResult({ key: requestKey, controllers, error: null });
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            controllers: [],
            error:
              requestError instanceof Error
                ? requestError.message
                : "Could not load controllers.",
          });
        }
      });

    return () => controller.abort();
  }, [accessToken, normalizedBaseUrl, requestKey]);

  useEffect(() => {
    if (!normalizedBaseUrl) {
      return;
    }

    const interval = setInterval(() => {
      setRefreshVersion((version) => version + 1);
    }, 30_000);

    return () => clearInterval(interval);
  }, [accessToken, normalizedBaseUrl]);

  const currentResult = result?.key === requestKey ? result : null;
  const refresh = useCallback(() => {
    setRefreshVersion((version) => version + 1);
  }, []);

  return {
    controllers: currentResult?.controllers ?? [],
    error: currentResult?.error ?? null,
    isLoading: Boolean(normalizedBaseUrl) && currentResult === null,
    refresh,
  };
}
