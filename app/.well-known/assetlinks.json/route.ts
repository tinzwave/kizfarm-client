// Android App Links verification: lets the KIZ FARM Android app open
// https://www.kizfarm.com/blog/... links directly. Android checks this file
// for the app's package name and signing-certificate fingerprint(s).
//
// The default is the Play App Signing key (Play Console > App integrity >
// App signing). Fingerprints are public, not secrets. To add more (e.g. an
// EAS-signed test build), set ANDROID_APP_SHA256_FINGERPRINTS in Vercel,
// comma-separated "AB:CD:...", which replaces this default.
export const dynamic = "force-dynamic";

const PLAY_APP_SIGNING_SHA256 =
  "56:FC:F1:33:0A:B3:23:20:D4:CB:87:C7:8B:93:5E:74:FA:64:73:A8:DE:FC:F0:5A:D3:67:1C:05:49:07:84:EE";

export function GET() {
  const fingerprints = (process.env.ANDROID_APP_SHA256_FINGERPRINTS || PLAY_APP_SIGNING_SHA256)
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
