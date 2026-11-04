import type { OpenRgbColor } from "./api";

/**
 * Averages available LED colors for a representative picker starting color.
 * @param colors Optional LED colors; undefined entries are ignored.
 * @returns Rounded RGB average as `#RRGGBB`, or white when none are available.
 */
export function averageColorHex(colors: (OpenRgbColor | undefined)[]) {
  const availableColors = colors.filter(
    (color): color is OpenRgbColor => color !== undefined,
  );
  if (availableColors.length === 0) return "#FFFFFF";

  const total = availableColors.reduce(
    (sum, color) => ({
      R: sum.R + color.R,
      G: sum.G + color.G,
      B: sum.B + color.B,
    }),
    { R: 0, G: 0, B: 0 },
  );
  return `#${[total.R, total.G, total.B]
    .map((channel) =>
      Math.round(channel / availableColors.length)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
