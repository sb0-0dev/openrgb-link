import { OpenRgbClient } from "@/services/openrgb/client";

/** Server-managed lighting profile name. */
export type LightingProfile = string;

type ProfilesResponse = {
  profiles: LightingProfile[];
};

type ProfileResponse = {
  status: string;
  profile: LightingProfile;
};

/**
 * Lists saved lighting profile names on the connected server.
 * @param client API client for the connected server.
 * @returns Profile names in server order.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export async function listLightingProfiles(
  client: OpenRgbClient,
): Promise<LightingProfile[]> {
  const response = await client.get<ProfilesResponse>("/api/server/profiles");
  return response.profiles;
}

/**
 * Applies a saved profile to the OpenRGB server.
 * @param client API client for the connected server.
 * @param profile Name of the saved profile.
 * @returns Server status and profile name.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function loadLightingProfile(
  client: OpenRgbClient,
  profile: LightingProfile,
): Promise<ProfileResponse> {
  return client.post<ProfileResponse>("/api/server/profiles/load", { profile });
}

/**
 * Saves the server's current lighting state under a profile name.
 * @param client API client for the connected server.
 * @param profile Name to assign to the saved state.
 * @returns Server status and profile name.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function saveLightingProfile(
  client: OpenRgbClient,
  profile: LightingProfile,
): Promise<ProfileResponse> {
  return client.post<ProfileResponse>("/api/server/profiles/save", { profile });
}

/**
 * Deletes a saved lighting profile by name.
 * @param client API client for the connected server.
 * @param profile Name of the profile to delete.
 * @returns Server status and profile name.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function deleteLightingProfile(
  client: OpenRgbClient,
  profile: LightingProfile,
): Promise<ProfileResponse> {
  return client.post<ProfileResponse>("/api/server/profiles/delete", {
    profile,
  });
}
