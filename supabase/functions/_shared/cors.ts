// These functions are called directly from the browser (supabase.functions.invoke),
// a different origin than the Supabase project itself, so every response --
// including the browser's CORS preflight OPTIONS request -- needs these
// headers or the browser blocks the request before it ever reaches the
// function. Without this, the client sees a bare network failure
// ("Failed to send a request to the Edge Function") with no real error
// detail, since a CORS-blocked response is unreadable to JS.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

// JSON response with CORS headers always attached, so every code path
// (success or error) is readable by the calling browser.
export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...init.headers },
  });
}
