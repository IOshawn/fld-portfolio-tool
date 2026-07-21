import type { HttpResponseInit } from "@azure/functions";

export function json(body: unknown, status = 200): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: {
      "Content-Type": "application/json"
    }
  };
}

export function errorResponse(error: unknown, status = 500): HttpResponseInit {
  const message = error instanceof Error ? error.message : "Unexpected API error.";
  return json({ error: message }, status);
}
