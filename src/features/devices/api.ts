import { OpenRgbClient } from "@/services/openrgb/client";

import { OpenRgbController, OpenRgbMode } from "./types";

/**
 * Returns the controllers currently discovered by the server.
 * @param client Authenticated or unauthenticated API client.
 * @param signal Optional cancellation signal for a stale screen request.
 * @returns Discovered controllers in server order.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function listControllers(
  client: OpenRgbClient,
  signal?: AbortSignal,
): Promise<OpenRgbController[]> {
  return client.get<OpenRgbController[]>("/api/controllers", signal);
}

/**
 * Returns available lighting modes for one controller.
 * @param client API client for the connected server.
 * @param controllerId OpenRGB controller identifier.
 * @param signal Optional cancellation signal.
 * @returns Mode names, supported controls, and current settings.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function listControllerModes(
  client: OpenRgbClient,
  controllerId: number,
  signal?: AbortSignal,
): Promise<OpenRgbMode[]> {
  return client.get<OpenRgbMode[]>(
    `/api/device/modes?id=${controllerId}`,
    signal,
  );
}

/** Request body for applying a mode and its configurable properties. */
export type SetControllerModeOptions = {
  mode: string;
  brightness: number;
  speed: number;
  direction: string;
  colors: { R: number; G: number; B: number }[];
  color_mode: number;
  save_to_device: boolean;
};

/**
 * Applies a mode and its supported settings to a controller.
 * @param client API client for the connected server.
 * @param controllerId OpenRGB controller identifier.
 * @param options Mode name and values for supported mode controls.
 * @returns Server status and the mode it applied.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function setControllerMode(
  client: OpenRgbClient,
  controllerId: number,
  options: SetControllerModeOptions,
): Promise<{ status: string; mode: string }> {
  return client.post<{ status: string; mode: string }>(
    `/api/device/mode?id=${controllerId}`,
    options,
  );
}

/** Lowercase RGB channels accepted by the color endpoint. */
export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

/** Zone summary returned by the device API. */
export type OpenRgbZone = {
  name: string;
  zone_type: number;
  leds: number;
  segments: number;
};

/** LED index/name and optional current color. */
export type OpenRgbLed = {
  name: string;
  value: number;
  color?: OpenRgbColor;
};

/** Uppercase RGB channels used in OpenRGB mode and LED responses. */
export type OpenRgbColor = { R: number; G: number; B: number };

/** Optional LED, zone, or segment destination for a color update. */
export type ControllerColorTarget =
  | { zone: number; segment?: number }
  | { led: number };

/** Segment definition sent when replacing a zone layout. */
export type OpenRgbSegment = {
  name: string;
  segment_type: number;
  start_idx: number;
  num_leds: number;
};

/** Segment definition with the server's zone-local segment index. */
export type OpenRgbSegmentInfo = OpenRgbSegment & {
  index: number;
};

/**
 * Applies an RGB color to a controller or optional LED target.
 * @param client API client for the connected server.
 * @param controllerId OpenRGB controller identifier.
 * @param color RGB channels in the 0–255 range.
 * @param target Optional LED, zone, or segment. Omit it to color the whole controller.
 * @returns Server status and a description of the affected target.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function setControllerColor(
  client: OpenRgbClient,
  controllerId: number,
  color: RgbColor,
  target?: ControllerColorTarget,
): Promise<{ status: string; target: string }> {
  return client.post<{ status: string; target: string }>(
    `/api/device/color?id=${controllerId}`,
    { ...color, ...target },
  );
}

/**
 * Returns LED entries and current colors for a controller.
 * @param client API client for the connected server.
 * @param controllerId OpenRGB controller identifier.
 * @returns LED names, indices, and colors when available.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function listControllerLeds(
  client: OpenRgbClient,
  controllerId: number,
): Promise<OpenRgbLed[]> {
  return client.get<OpenRgbLed[]>(`/api/device/leds?id=${controllerId}`);
}

/**
 * Returns the zone layout reported by a controller.
 * @param client API client for the connected server.
 * @param controllerId OpenRGB controller identifier.
 * @returns Zone names, types, LED counts, and segment counts.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function listControllerZones(
  client: OpenRgbClient,
  controllerId: number,
): Promise<OpenRgbZone[]> {
  return client.get<OpenRgbZone[]>(`/api/device/zones?id=${controllerId}`);
}

/**
 * Changes the LED count assigned to a named controller zone.
 * @param client API client for the connected server.
 * @param controllerId OpenRGB controller identifier.
 * @param zone Name of the zone to resize.
 * @param size New LED count requested for the zone.
 * @returns Server status and the resized zone name.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function resizeControllerZone(
  client: OpenRgbClient,
  controllerId: number,
  zone: string,
  size: number,
): Promise<{ status: string; zone: string }> {
  return client.post<{ status: string; zone: string }>(
    `/api/device/zones/resize?id=${controllerId}`,
    { zone, size },
  );
}

/**
 * Returns the named LED segments for a zone index.
 * @param client API client for the connected server.
 * @param controllerId OpenRGB controller identifier.
 * @param zoneIndex Zero-based zone index.
 * @returns Segment definitions with their zone-local indexes.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function listZoneSegments(
  client: OpenRgbClient,
  controllerId: number,
  zoneIndex: number,
): Promise<OpenRgbSegmentInfo[]> {
  return client.get<OpenRgbSegmentInfo[]>(
    `/api/device/segments?id=${controllerId}&zone=${zoneIndex}`,
  );
}

/**
 * Replaces a zone's segments. The API requires deleting the prior layout
 * before posting its replacement.
 * @param client API client for the connected server.
 * @param controllerId OpenRGB controller identifier.
 * @param zoneIndex Zero-based zone index.
 * @param zoneLedCount Total LED count assigned to the zone.
 * @param segments Replacement segments; an empty list leaves the zone without segments.
 * @throws {OpenRgbApiError} For HTTP failures. A failed POST after DELETE can
 *   leave the previous layout removed.
 */
export async function replaceZoneSegments(
  client: OpenRgbClient,
  controllerId: number,
  zoneIndex: number,
  zoneLedCount: number,
  segments: OpenRgbSegment[],
): Promise<void> {
  await client.delete<void>(
    `/api/device/segments?id=${controllerId}&zone=${zoneIndex}`,
  );
  if (segments.length > 0) {
    await client.post(`/api/device/segments?id=${controllerId}`, {
      zone: zoneIndex,
      zone_leds: zoneLedCount,
      segments,
    });
  }
}
