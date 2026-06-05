const env = import.meta.env as ImportMetaEnv & {
  readonly VITE_API_BASE_URL?: string;
};

const apiBaseUrl = (env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

type Fallback<T> = T | (() => T | Promise<T>);
type RequestMethod = "GET" | "POST";
type RequestBody = string | Record<string, unknown> | ArrayBuffer | undefined;
type FallbackOptions = {
  fallbackOnHttpError?: boolean;
};

export class HttpStatusError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "HttpStatusError";
  }
}

export async function getJsonWithFallback<T>(
  path: string,
  fallback: Fallback<T>,
  options: FallbackOptions = {},
): Promise<T> {
  try {
    return await requestJson<T>({ path, method: "GET" });
  } catch (error) {
    if (error instanceof HttpStatusError && options.fallbackOnHttpError === false) {
      throw error;
    }

    console.warn(`[api] ${path} failed, using local fallback`, error);
    return resolveFallback(fallback);
  }
}

export async function postJsonWithFallback<TResponse, TBody>(
  path: string,
  body: TBody,
  fallback: Fallback<TResponse>,
  options: FallbackOptions = {},
): Promise<TResponse> {
  try {
    return await requestJson<TResponse>({ path, method: "POST", body });
  } catch (error) {
    if (error instanceof HttpStatusError && options.fallbackOnHttpError === false) {
      throw error;
    }

    console.warn(`[api] ${path} failed, using local fallback`, error);
    return resolveFallback(fallback);
  }
}

function requestJson<T>({
  path,
  method,
  body,
}: {
  path: string;
  method: RequestMethod;
  body?: unknown;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${apiBaseUrl}${path}`,
      method,
      data: body as RequestBody,
      timeout: 2500,
      success(response) {
        const statusCode = response.statusCode ?? 0;

        if (statusCode >= 200 && statusCode < 300) {
          resolve(response.data as T);
          return;
        }

        reject(new HttpStatusError(`${method} ${path} failed with ${statusCode}`, statusCode));
      },
      fail(error) {
        reject(error);
      },
    });
  });
}

async function resolveFallback<T>(fallback: Fallback<T>): Promise<T> {
  return typeof fallback === "function"
    ? await (fallback as () => T | Promise<T>)()
    : fallback;
}
