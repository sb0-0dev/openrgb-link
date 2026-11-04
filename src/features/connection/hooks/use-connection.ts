import { useState } from "react";

import { checkServerHealth } from "@/features/connection/api";
import { OpenRgbClient } from "@/services/openrgb/client";

/** User-facing states for a one-off server health check. */
export type ConnectionStatus = "idle" | "checking" | "connected" | "error";

/**
 * Exposes a simple health-check state machine for one server address.
 * @returns Current status, latest error, and a function to check a URL.
 */
export function useConnection() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  /**
   * Checks a server and records success or failure in hook state.
   * @param baseUrl HTTP(S) API address to check.
   * @returns Resolves after status has been updated; errors are exposed as state.
   */
  async function checkConnection(baseUrl: string) {
    setStatus("checking");
    setError(null);

    try {
      const health = await checkServerHealth(new OpenRgbClient({ baseUrl }));
      if (health.status !== "ok") {
        throw new Error("The server returned an unexpected response.");
      }
      setStatus("connected");
    } catch (connectionError) {
      setError(
        connectionError instanceof Error
          ? connectionError.message
          : "Could not reach the OpenRGB server.",
      );
      setStatus("error");
    }
  }

  return { status, error, checkConnection };
}
