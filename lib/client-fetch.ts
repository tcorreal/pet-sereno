type ApiErrorBody = { error?: string };

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackMessage = "No pudimos completar la operación. Intenta de nuevo.",
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new Error("No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.");
  }

  const text = await response.text();
  let body: T & ApiErrorBody;
  try {
    body = (text ? JSON.parse(text) : {}) as T & ApiErrorBody;
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) throw new Error(body.error || fallbackMessage);
  return body;
}
