import { useState } from "react";

import { ClientCompatibilityError } from "@/features/connection/version";
import { useServerProfiles } from "@/features/connection/hooks/use-server-profiles";
import { ServerProfile } from "@/features/connection/storage";

/**
 * Adds screen-level connection and profile-removal feedback to profile storage.
 * @param onConnected Called after a profile successfully becomes active.
 * @returns Profile state and actions plus connecting and removal feedback.
 */
export function useServerConnection(onConnected: () => void) {
  const serverProfiles = useServerProfiles();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [compatibilityError, setCompatibilityError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  /**
   * Connects a profile and invokes the screen reset callback on success.
   * @param profile Saved server to activate.
   * @returns Resolves after loading the profile; failures are exposed as hook state.
   */
  async function connect(profile: ServerProfile) {
    setConnectingId(profile.id);
    setConnectionError(null);
    setCompatibilityError(null);
    try {
      await serverProfiles.connectProfile(profile);
      onConnected();
    } catch (error) {
      if (error instanceof ClientCompatibilityError) {
        setCompatibilityError(error.message);
        setConnectionError(null);
        return;
      }
      setConnectionError(
        error instanceof Error ? error.message : "Could not connect to this server.",
      );
    } finally {
      setConnectingId(null);
    }
  }

  /**
   * Removes a profile and stores any failure as connection-screen feedback.
   * @param profile Saved server to remove.
   * @returns Resolves after the removal attempt; errors are exposed as hook state.
   */
  async function removeProfile(profile: ServerProfile) {
    try {
      await serverProfiles.removeProfile(profile);
      setConfirmRemoveId(null);
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Could not remove this profile.",
      );
    }
  }

  return {
    ...serverProfiles,
    connectingId,
    connectionError,
    compatibilityError,
    setConnectionError,
    confirmRemoveId,
    setConfirmRemoveId,
    connect,
    removeProfile,
  };
}
