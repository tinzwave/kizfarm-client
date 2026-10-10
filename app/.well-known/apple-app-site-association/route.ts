// iOS Universal Links verification: lets the KIZ FARM iPhone app open
// https://www.kizfarm.com/blog/... links directly. Must be served as JSON
// with no redirect.
//
// Set APPLE_TEAM_ID in Vercel (Apple Developer account > Membership).
// Until then this returns no app ids and links open in the browser.
export const dynamic = "force-dynamic";

export function GET() {
  const teamId = (process.env.APPLE_TEAM_ID || "").trim();
  const appIds = teamId ? [`${teamId}.com.kizfarm.mobile`] : [];
  return Response.json(
    { applinks: { details: [{ appIDs: appIds, components: [{ "/": "/blog/*", comment: "Blog posts open in the app" }] }] } },
    { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } },
  );
}
