// Deletes a buyer/farmer account. Two callers:
//   - the user themselves ("Delete my account" in the apps) -> no body
//     userId, or their own id;
//   - an admin ("Delete" in the admin panel) -> body { userId }.
// Admin accounts can never be deleted here.
//
// public.delete_account_data does the database work (see migration 0040):
// it removes the account outright when there's no order/chat/payment
// history, otherwise erases personal data and leaves an anonymised
// "Deleted user" behind for the financial records. This function then
// removes their uploaded files and either deletes the login or bans it
// and frees the email address so it can be used for a new signup.
import { adminClient, callerClient } from "../_shared/supabase-admin.ts";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";

async function removeFolder(admin: ReturnType<typeof adminClient>, bucket: string, folder: string) {
  const { data } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
  const paths = (data || []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
  if (paths.length) await admin.storage.from(bucket).remove(paths);
  return paths.length;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, { status: 405 });

  try {
    const caller = callerClient(req);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetId: string = body?.userId || user.id;

    const admin = adminClient();
    const { data: callerProfile } = await admin.from("profiles").select("role, status").eq("id", user.id).single();
    const isAdmin = callerProfile?.role === "admin" && callerProfile?.status === "active";
    if (targetId !== user.id && !isAdmin) {
      return jsonResponse({ error: "Only an admin can delete another account." }, { status: 403 });
    }

    const { data: target } = await admin.from("profiles").select("role").eq("id", targetId).maybeSingle();
    if (target?.role === "admin") {
      return jsonResponse({ error: "Admin accounts cannot be deleted here." }, { status: 400 });
    }

    const { data: result, error } = await admin.rpc("delete_account_data", { p_user_id: targetId });
    if (error) return jsonResponse({ error: error.message }, { status: 400 });

    // Uploaded files: ID documents, course covers; product photos too when
    // the farm itself is gone.
    let filesRemoved = 0;
    filesRemoved += await removeFolder(admin, "farmer-kyc", targetId);
    filesRemoved += await removeFolder(admin, "course-covers", targetId);
    if (result?.hard_delete && result?.farmer_id) {
      filesRemoved += await removeFolder(admin, "product-images", result.farmer_id);
    }

    if (result?.hard_delete) {
      const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
      if (delErr && !/not found/i.test(delErr.message)) {
        return jsonResponse({ error: delErr.message }, { status: 500 });
      }
    } else {
      // Keep the auth row (profiles/orders still reference it) but make it
      // unusable, and release the real email address for a future signup.
      const { error: banErr } = await admin.auth.admin.updateUserById(targetId, {
        email: `deleted-${targetId}@deleted.kizfarm.invalid`,
        password: crypto.randomUUID() + crypto.randomUUID(),
        ban_duration: "876000h",
        user_metadata: {},
        email_confirm: true,
      });
      if (banErr) return jsonResponse({ error: banErr.message }, { status: 500 });
    }

    return jsonResponse({ ok: true, removed: result?.hard_delete ? "deleted" : "anonymised", filesRemoved });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Server error" }, { status: 500 });
  }
});
