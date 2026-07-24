const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface SSEHandlers {
  onEvent: (event: string, data: Record<string, unknown>) => void;
  onError?: (message: string) => void;
}

/**
 * POSTs JSON to an SSE endpoint and dispatches `event:`/`data:` frames to
 * `onEvent`. The shared `request()` helper can't be used here because chat
 * responses stream raw text/event-stream instead of the JSON envelope.
 */
export async function streamSSE(
  path: string,
  body: unknown,
  token: string | undefined,
  handlers: SSEHandlers,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch {
    handlers.onError?.('Network error — is the server running?');
    return;
  }

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try { message = (await res.json()).message ?? message; } catch { /* not json */ }
    handlers.onError?.(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Frames are separated by a blank line.
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      let event = 'message';
      let data = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(data); } catch { /* keep empty */ }
      handlers.onEvent(event, parsed);
    }
  }
}
