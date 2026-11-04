/** Connection settings shared by requests to one OpenRGB API service. */
type OpenRgbClientOptions = {
  baseUrl: string;
  accessToken?: string;
};

/**
 * HTTP error returned by an OpenRGB endpoint.
 * @extends Error
 * @property status HTTP response status code.
 */
export class OpenRgbApiError extends Error {
  /**
   * @param message Human-readable server error or HTTP status fallback.
   * @param status HTTP response status code.
   */
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "OpenRgbApiError";
  }
}

/**
 * Small authenticated JSON client used by all feature API modules.
 * Trims trailing slashes from the base URL and adds a bearer header when supplied.
 */
export class OpenRgbClient {
  private readonly baseUrl: string;
  private readonly accessToken?: string;

  /** @param options Base HTTP(S) URL and optional bearer token. */
  constructor({ baseUrl, accessToken }: OpenRgbClientOptions) {
    this.baseUrl = baseUrl.trim().replace(/\/+$/, "");
    this.accessToken = accessToken?.trim() || undefined;
  }

  /**
   * Sends a JSON GET request; an optional signal cancels in-flight work.
   * @param path API path appended to the configured base URL.
   * @param signal Optional request cancellation signal.
   * @returns The parsed JSON response, or `undefined` for an empty response.
   * @throws {OpenRgbApiError} When the server responds with a non-2xx status.
   * @throws {Error} When no base URL is set or a successful response is invalid JSON.
   */
  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: "GET", signal });
  }

  /**
   * Sends a JSON POST request with the supplied endpoint payload.
   * @param path API path appended to the configured base URL.
   * @param body Value serialized as the JSON request body.
   * @param signal Optional request cancellation signal.
   * @returns The parsed endpoint response.
   * @throws {OpenRgbApiError} When the server responds with a non-2xx status.
   * @throws {Error} When no base URL is set or a successful response is invalid JSON.
   */
  post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  }

  /**
   * Sends a DELETE request and parses an optional JSON response.
   * @param path API path appended to the configured base URL.
   * @param signal Optional request cancellation signal.
   * @returns Parsed response, or `undefined` for an empty response.
   * @throws {OpenRgbApiError} When the server responds with a non-2xx status.
   */
  delete<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: "DELETE", signal });
  }

  /**
   * Applies shared headers and converts HTTP or malformed JSON responses to errors.
   * Non-JSON error bodies fall back to the HTTP status; successful non-JSON bodies fail.
   * @param path API path appended to the configured base URL.
   * @param options Fetch request options for the endpoint call.
   * @returns The typed, parsed response body.
   * @throws {OpenRgbApiError} For non-2xx HTTP responses.
   * @throws {Error} For an empty base URL or malformed successful JSON response.
   */
  private async request<T>(path: string, options: RequestInit): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("Set the OpenRGB server address first.");
    }

    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });
    const responseText = await response.text();
    let responseBody: unknown;

    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        if (response.ok) {
          throw new Error("The server returned invalid JSON.");
        }
      }
    }

    if (!response.ok) {
      const errorMessage =
        typeof responseBody === "object" &&
        responseBody !== null &&
        "error" in responseBody &&
        typeof responseBody.error === "string"
          ? responseBody.error
          : `Request failed with HTTP ${response.status}.`;
      throw new OpenRgbApiError(errorMessage, response.status);
    }

    if (response.status === 204 || responseText.length === 0) {
      return undefined as T;
    }

    return responseBody as T;
  }
}
