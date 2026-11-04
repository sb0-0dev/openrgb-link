import AsyncStorage from "@react-native-async-storage/async-storage";

/** Non-secret server metadata; bearer tokens are stored separately. */
export type ServerProfile = {
  id: string;
  name: string;
  baseUrl: string;
  deviceId: string;
};

const profilesKey = "openrgb.server-profiles";

/**
 * Loads saved server profiles and ignores malformed individual entries.
 * @returns Valid profiles, or an empty list when storage is empty or has the
 *   wrong top-level shape. Storage and JSON parsing errors can reject the promise.
 */
export async function loadServerProfiles(): Promise<ServerProfile[]> {
  const value = await AsyncStorage.getItem(profilesKey);
  if (!value) return [];

  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (profile): profile is ServerProfile =>
      typeof profile === "object" &&
      profile !== null &&
      "id" in profile &&
      typeof profile.id === "string" &&
      "name" in profile &&
      typeof profile.name === "string" &&
      "baseUrl" in profile &&
      typeof profile.baseUrl === "string" &&
      "deviceId" in profile &&
      typeof profile.deviceId === "string",
  );
}

/**
 * Persists the current profile list in device/browser key-value storage.
 * @param profiles Profiles to serialize.
 * @returns Resolves when storage completes; rejects on storage failure.
 */
export function saveServerProfiles(profiles: ServerProfile[]): Promise<void> {
  return AsyncStorage.setItem(profilesKey, JSON.stringify(profiles));
}
