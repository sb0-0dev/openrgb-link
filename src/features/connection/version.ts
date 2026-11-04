import Constants from "expo-constants";

import type { ServerVersion } from "@/features/connection/api";

/** Client version compiled into the current Expo application binary. */
export const CLIENT_VERSION = Constants.expoConfig?.version ?? "1.0.0";

/** Parses a numeric dotted version and compares it with another version. */
export function compareVersions(left: string, right: string): number {
  const parse = (version: string) => {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    if (!match) throw new Error(`Invalid version string: ${version}`);
    return match.slice(1, 4).map(Number);
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

/** Error raised when a server requires a newer client release. */
export class ClientCompatibilityError extends Error {
  constructor(public readonly serverVersion: ServerVersion) {
    super(
      serverVersion.message ??
        `This server requires OpenRGB Link ${serverVersion.minimumClientVersion} or later. Update the app to continue.`,
    );
    this.name = "ClientCompatibilityError";
  }
}

/** Confirms the client meets the server's minimum supported version. */
export function assertClientCompatible(serverVersion: ServerVersion): void {
  if (
    compareVersions(CLIENT_VERSION, serverVersion.minimumClientVersion) < 0
  ) {
    throw new ClientCompatibilityError(serverVersion);
  }
}

/** Returns an upgrade notice when the server API is below its recommendation. */
export function getApiUpgradeMessage(serverVersion: ServerVersion): string | null {
  if (serverVersion.apiVersion >= serverVersion.recommendedApiVersion) {
    return null;
  }
  return (
    serverVersion.message ??
    `This server uses API v${serverVersion.apiVersion}. Upgrade the backend to API v${serverVersion.recommendedApiVersion} to access all features.`
  );
}
