import * as SecureStore from "expo-secure-store";

/** Stores a paired-server token in the native secure store. */
export function saveAccessToken(
  profileId: string,
  token: string,
): Promise<void> {
  return SecureStore.setItemAsync(`openrgb-token-${profileId}`, token);
}

/** Reads a native token, returning null when the profile is not paired. */
export function getAccessToken(profileId: string): Promise<string | null> {
  return SecureStore.getItemAsync(`openrgb-token-${profileId}`);
}

/** Removes a native token when its server profile is deleted. */
export function deleteAccessToken(profileId: string): Promise<void> {
  return SecureStore.deleteItemAsync(`openrgb-token-${profileId}`);
}
