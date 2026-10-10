// Android App Links verification: lets the KIZ FARM Android app open
// https://www.kizfarm.com/blog/... links directly. Android checks this file
// for the app's package name and signing-certificate fingerprint(s).
//
// Set ANDROID_APP_SHA256_FINGERPRINTS (comma-separated, "AB:CD:...") in
// Vercel from the EAS build credentials (`eas credentials`, or Play
// Console > App integrity > App signing key). Until then this returns an
// empty list and links simply open in the browser.
export const dynamic = "force-dynamic";

export function GET() {
  const fingerprints = (process.env.ANDROID_APP_SHA256_FINGERPRINTS || "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  const body = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: "com.kizfarm.mobile", sha256_cert_fingerprints: fingerprints },
        },
      ]
    : [];
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
