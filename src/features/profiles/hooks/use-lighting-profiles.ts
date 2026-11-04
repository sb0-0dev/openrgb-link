import { useEffect, useState } from "react";

import {
  deleteLightingProfile,
  listLightingProfiles,
  loadLightingProfile,
  LightingProfile,
  saveLightingProfile,
} from "@/features/profiles/api";
import { OpenRgbClient } from "@/services/openrgb/client";

/**
 * Loads profiles and exposes serialized load, save, delete, and refresh actions.
 * @param baseUrl Connected server API address.
 * @param accessToken Bearer token for the paired device.
 * @returns Profile names, progress/errors, CRUD actions, and refresh.
 */
export function useLightingProfiles(baseUrl: string, accessToken: string) {
  const [profiles, setProfiles] = useState<LightingProfile[]>([]);
  const [busyProfile, setBusyProfile] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestKey = JSON.stringify([baseUrl, accessToken, refreshVersion]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    listLightingProfiles(new OpenRgbClient({ baseUrl, accessToken }))
      .then((items) => {
        if (isCurrent) setProfiles(items);
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load profiles.",
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
   * Runs one profile mutation, then reloads names from the server.
   * @param profile Raw profile name to validate and trim.
   * @param action API operation to perform.
   * @param successMessage Status shown after the operation and refresh succeed.
   * @returns Resolves after the action; failures are captured in `error` state.
   */
  async function runProfileAction(
    profile: string,
    action: (client: OpenRgbClient, name: string) => Promise<unknown>,
    successMessage: string,
  ) {
    const name = profile.trim();
    if (!name) {
      setError("Enter a profile name.");
      return;
    }

    setBusyProfile(name);
    setError(null);
    setMessage(null);
    try {
      await action(new OpenRgbClient({ baseUrl, accessToken }), name);
      // Refresh after writes so server-side changes remain the source of truth.
      const updatedProfiles = await listLightingProfiles(
        new OpenRgbClient({ baseUrl, accessToken }),
      );
      setProfiles(updatedProfiles);
      setMessage(successMessage);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The profile action failed.",
      );
    } finally {
      setBusyProfile(null);
    }
  }

  return {
    profiles,
    isLoading: loadedKey !== requestKey,
    busyProfile,
    message,
    error,
    load: (name: string) =>
      runProfileAction(name, loadLightingProfile, "Profile loaded."),
    save: (name: string) =>
      runProfileAction(name, saveLightingProfile, "Profile saved."),
    remove: (name: string) =>
      runProfileAction(name, deleteLightingProfile, "Profile deleted."),
    refresh: () => setRefreshVersion((version) => version + 1),
  };
}
