// Reads the AI assistant's answer as Server-Sent Events (POST /api/chatbot/message/stream).
// axios cannot stream in the browser, so this uses fetch + ReadableStream.
//
// Throws an Error with .status (HTTP status, 500 for errors reported inside the stream) and, for 429,
// .retryAfter (seconds). Resolves with { reply, sources, contextUsed, messageId } when the answer is complete.
export async function streamChat({ apiUrl, token, message, onToken, signal }) {
  const res = await fetch(`${apiUrl}/api/chatbot/message/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-auth-token": token },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.msg || `Request failed (${res.status})`);
    err.status = res.status;
    err.retryAfter = Number(res.headers.get("retry-after")) || undefined;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;
  let streamError = null;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // events are separated by a blank line
    let end;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const raw = /^data: (.+)$/m.exec(block)?.[1];
      if (!event || !raw) continue;
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        continue;
      }
      if (event === "token") onToken?.(data.text);
      else if (event === "done") result = data;
      else if (event === "error") streamError = data.msg;
    }
  }

  if (streamError) {
    const err = new Error(streamError);
    err.status = 500;
    throw err;
  }
  if (!result) throw new Error("The answer stream ended unexpectedly. Please try again.");
  return result;
}
