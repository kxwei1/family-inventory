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
    readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = "HttpStatusError";
  }
}

let globalErrorHandler: ((error: HttpStatusError) => void) | null = null;

export function setGlobalApiErrorHandler(handler: (error: HttpStatusError) => void) {
  globalErrorHandler = handler;
}

export async function getJsonWithFallback<T>(
  path: string,
  fallback: Fallback<T>,
  options: FallbackOptions = {},
): Promise<T> {
  try {
    return await requestJson<T>({ path, method: "GET" });
  } catch (error) {
    if (error instanceof HttpStatusError) {
      if (options.fallbackOnHttpError === false) throw error;
      reportHttpError(error);
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
    if (error instanceof HttpStatusError) {
      if (options.fallbackOnHttpError === false) throw error;
      reportHttpError(error);
    }

    console.warn(`[api] ${path} failed, using local fallback`, error);
    return resolveFallback(fallback);
  }
}

function reportHttpError(error: HttpStatusError) {
  if (globalErrorHandler) {
    try {
      globalErrorHandler(error);
    } catch {
      // never let error handler break the callsite
    }
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

        reject(
          new HttpStatusError(
            `${method} ${path} failed with ${statusCode}`,
            statusCode,
            response.data,
          ),
        );
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
