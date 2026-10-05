// Backward compatibility for mobile app builds released before the
// Flutterwave switch. Those builds still invoke create-opay-order-payment /
// create-opay-course-payment and read `cashierUrl` from the response. These
// aliases forward the request (with the caller's own Authorization header,
// so RLS and ownership checks are unchanged) to the Flutterwave function
// and return its link under both names.
//
// The rest of the old flow already works against Flutterwave: old builds
// load the link in a WebView and intercept their kizfarm://opay-return
// redirect_url (Flutterwave accepts custom schemes), then call
// verify-and-pay-order / purchase-course, which now verify with
// Flutterwave. Delete these aliases once no pre-Flutterwave builds remain
// in use.
import { handleCorsPreflight, jsonResponse } from "./cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

export function serveLegacyOpayAlias(targetFunction: string) {
  Deno.serve(async (req) => {
    const preflight = handleCorsPreflight(req);
    if (preflight) return preflight;

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, { status: 405 });
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      for (const name of ["authorization", "apikey"]) {
        const value = req.headers.get(name);
        if (value) headers[name] = value;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/${targetFunction}`, {
        method: "POST",
        headers,
        body: await req.text(),
      });
      const data = await response.json().catch(() => ({ error: "Server error" }));
      if (data?.checkoutUrl) data.cashierUrl = data.checkoutUrl;
      return jsonResponse(data, { status: response.status });
    } catch (err) {
      console.error(err);
      return jsonResponse({ error: "Server error" }, { status: 500 });
    }
  });
}
