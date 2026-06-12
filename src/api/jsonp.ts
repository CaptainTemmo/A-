let callbackCounter = 0;

export interface JsonpOptions {
  timeout?: number;
  callbackParam?: string;
  callbackName?: string;
}

export function jsonp<T = unknown>(
  url: string,
  options: JsonpOptions = {}
): Promise<T> {
  const { timeout = 10000, callbackParam = 'cb', callbackName } = options;

  return new Promise((resolve, reject) => {
    const cbName = callbackName || `jsonp_cb_${Date.now()}_${++callbackCounter}`;

    const script = document.createElement('script');
    script.async = true;

    let timer: number | null = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      try {
        delete (window as unknown as Record<string, unknown>)[cbName];
      } catch {
        try {
          (window as unknown as Record<string, unknown>)[cbName] = null;
        } catch {
          // ignore
        }
      }
    };

    (window as unknown as Record<string, unknown>)[cbName] = (data: unknown) => {
      cleanup();
      resolve(data as T);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`JSONP request failed: ${url}`));
    };

    const sep = url.includes('?') ? '&' : '?';
    script.src = `${url}${sep}${callbackParam}=${cbName}`;

    document.body.appendChild(script);

    timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`JSONP request timeout: ${url}`));
    }, timeout);
  });
}
