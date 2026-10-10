"use client";

import { useState } from "react";
import { deleteAccount } from "@/lib/kizfarm/supabase-mutations";

// "Delete account" with a type-DELETE-to-confirm dialog. Used by admins on
// buyer/farmer records (pass userId) and by users on their own profile
// (omit userId).
export default function DeleteAccountButton({
  userId,
  name,
  self = false,
  onDeleted,
  className,
  label,
}: {
  userId?: string;
  name?: string;
  self?: boolean;
  onDeleted: () => void;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    const { res, payload } = await deleteAccount(self ? undefined : userId);
    setBusy(false);
    if (!res.ok) {
      setError((payload as { error?: string })?.error || "Could not delete the account.");
      return;
    }
    setOpen(false);
    onDeleted();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setConfirmText("");
          setError("");
        }}
        className={className ?? "w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 transition-colors"}
      >
        {label ?? (self ? "Delete my account" : "Delete account")}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-red-700">
              <span className="material-symbols-outlined">warning</span>
              <h2 className="text-lg font-bold">{self ? "Delete your account?" : `Delete ${name || "this account"}?`}</h2>
            </div>
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>{self ? "You" : "They"} will be signed out and can never log in to this account again.</li>
              <li>Personal details, addresses, bank details, ID documents and photos are permanently erased.</li>
              <li>Products are removed from the marketplace.</li>
              <li>Past orders and payments are kept for records, shown as &quot;Deleted user&quot;.</li>
            </ul>
            <p className="mb-2 text-sm font-semibold text-slate-800">
              Type <span className="font-mono text-red-700">DELETE</span> to confirm
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono"
              autoFocus
            />
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={busy || confirmText.trim() !== "DELETE"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
