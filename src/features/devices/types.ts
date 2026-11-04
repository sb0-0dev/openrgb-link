/**
 * Controller fields returned by the server's discovery endpoint.
 * @property id Stable OpenRGB controller identifier used by device endpoints.
 * @property name User-facing device name; not used to classify its type.
 * @property type Numeric OpenRGB `DeviceType` value.
 * @property type_name Display form of the OpenRGB `DeviceType` value.
 * @property vendor Manufacturer, when supplied by the device.
 * @property model Device model, when supplied.
 * @property serial Device serial number, when supplied.
 * @property modes Number of available lighting modes.
 * @property zones Number of LED zones.
 * @property leds Number of LEDs exposed by the controller.
 */
export type OpenRgbController = {
  id: number;
  name: string;
  type: number;
  type_name: string;
  vendor: string;
  model: string;
  serial: string;
  modes: number;
  zones: number;
  leds: number;
};

/**
 * Mode capabilities and current settings advertised by a controller.
 * Capability flags determine which controls are safe to expose in the editor.
 * @property name Mode name sent back when applying this mode.
 * @property is_current Whether the controller currently uses this mode.
 * @property speed_min Minimum speed value advertised by the device.
 * @property speed_max Maximum speed value advertised by the device.
 * @property brightness_min Minimum brightness value advertised by the device.
 * @property brightness_max Maximum brightness value advertised by the device.
 * @property colors_min Minimum number of mode colors accepted by the device.
 * @property colors_max Maximum number of mode colors accepted by the device.
 * @property color_mode Current color mode identifier.
 * @property color_mode_name Human-readable color mode name.
 * @property colors Current mode palette in OpenRGB RGB channel format.
 * @property supports_speed Whether speed can be edited.
 * @property supports_brightness Whether brightness can be edited.
 * @property supports_direction_lr Whether horizontal direction is supported.
 * @property supports_direction_ud Whether vertical direction is supported.
 * @property supports_direction_hv Whether horizontal/vertical direction is supported.
 * @property supports_unique_led_color Whether every LED can use a unique color.
 * @property supports_mode_color Whether the mode accepts a fixed color palette.
 * @property supports_random_color Whether the mode can choose random colors.
 */
export type OpenRgbMode = {
  name: string;
  is_current: boolean;
  speed_min: number;
  speed_max: number;
  brightness_min: number;
  brightness_max: number;
  colors_min: number;
  colors_max: number;
  color_mode: number;
  color_mode_name: string;
  colors: { R: number; G: number; B: number }[];
  supports_speed: boolean;
  supports_brightness: boolean;
  supports_direction_lr: boolean;
  supports_direction_ud: boolean;
  supports_direction_hv: boolean;
  supports_unique_led_color: boolean;
  supports_mode_color: boolean;
  supports_random_color: boolean;
};
