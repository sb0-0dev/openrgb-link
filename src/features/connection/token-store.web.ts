import AsyncStorage from "@react-native-async-storage/async-storage";

const tokenKey = (profileId: string) => `openrgb.access-token.${profileId}`;

/** Stores a paired-server token in browser storage for the web build. */
export function saveAccessToken(
  profileId: string,
  token: string,
): Promise<void> {
  return AsyncStorage.setItem(tokenKey(profileId), token);
}

/** Reads a browser-stored token, returning null when the profile is not paired. */
export function getAccessToken(profileId: string): Promise<string | null> {
  return AsyncStorage.getItem(tokenKey(profileId));
}

/** Removes a browser-stored token when its server profile is deleted. */
export function deleteAccessToken(profileId: string): Promise<void> {
  return AsyncStorage.removeItem(tokenKey(profileId));
}
