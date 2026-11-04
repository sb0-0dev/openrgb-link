import { OpenRgbClient } from "@/services/openrgb/client";

import { OpenRgbEffect } from "./types";

type EffectsResponse = {
  effects: OpenRgbEffect[];
  enabled_effects?: OpenRgbEffect[];
};

/**
 * Returns supported effects and the subset currently enabled on the server.
 * @param client API client for the connected server.
 * @returns All effect names and the enabled subset.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export async function listEffects(
  client: OpenRgbClient,
): Promise<{ effects: OpenRgbEffect[]; enabledEffects: OpenRgbEffect[] }> {
  const response = await client.get<EffectsResponse>("/api/server/effects");
  return {
    effects: response.effects,
    enabledEffects: response.enabled_effects ?? [],
  };
}

/**
 * Enables or disables one server-wide effect.
 * @param client API client for the connected server.
 * @param effect Server-provided effect identifier.
 * @param enable Whether the effect should be active.
 * @returns Server status and the affected effect name.
 * @throws {OpenRgbApiError} For HTTP failures; network failures also reject.
 */
export function setEffect(
  client: OpenRgbClient,
  effect: OpenRgbEffect,
  enable: boolean,
): Promise<{ status: string; effect: string }> {
  return client.post<{ status: string; effect: string }>("/api/server/effect", {
    effect,
    enable,
  });
}
