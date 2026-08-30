"use client";

import React, { useEffect, useState } from "react";
import { getMyFarmerProfile } from "@/lib/kizfarm/supabase-data";
import { submitFarmerVerification } from "@/lib/kizfarm/supabase-mutations";

interface FarmerVerification {
  _id: string;
  status: string;
  bvn: string | null;
  bvnUrl: string | null;
  nin: string | null;
  govIdUrl: string | null;
  selfieUrl: string | null;
  farmAddress: string | null;
  farmImageUrls: string[];
  rejectionReason: string | null;
}

export default function FarmerVerifyPage() {
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<FarmerVerification | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [bvn, setBvn] = useState("");
  const [nin, setNin] = useState("");
  const [farmAddress, setFarmAddress] = useState("");
  const [bvnFile, setBvnFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [farmImageFiles, setFarmImageFiles] = useState<File[]>([]);

  const load = async () => {
    setLoading(true);
    const { payload } = await getMyFarmerProfile();
    setFarmer((payload?.farmer as FarmerVerification) || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleFarmImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFarmImageFiles(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const hasExistingFarmImages = (farmer?.farmImageUrls?.length || 0) === 5;
    if (farmImageFiles.length > 0 && farmImageFiles.length !== 5) {
      setError("Please select exactly 5 farm images.");
      return;
    }
    if (farmImageFiles.length === 0 && !hasExistingFarmImages) {
      setError("Exactly 5 farm images are required.");
      return;
    }

    setSubmitting(true);
    try {
      const { res, payload } = await submitFarmerVerification({
        bvn: bvn || undefined,
        nin: nin || undefined,
        farmAddress: farmAddress || undefined,
        bvnFile,
        govIdFile,
        selfieFile,
        farmImageFiles: farmImageFiles.length === 5 ? farmImageFiles : undefined,
      });
      if (!res.ok) {
        setError(payload?.error || "Submission failed");
        return;
      }
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="pt-32 text-center">Loading…</div>;

  if (!farmer)
    return (
      <div className="pt-32 text-center">
        No farmer record found. Please register first.
      </div>
    );

  return (
    <div className="pt-24 max-w-3xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Identity Verification</h2>
      <p className="mb-4">
        Status: <strong>{farmer.status}</strong>
      </p>
      {farmer.status === "pending" || farmer.status === "approved" ? (
        <div className="bg-white p-4 rounded shadow">
          <p className="mb-2">
            BVN:{" "}
            {farmer.bvnUrl ? (
              <a className="text-primary" href={farmer.bvnUrl} target="_blank">
                View
              </a>
            ) : (
              "Not provided"
            )}
          </p>
          <p className="mb-2">
            BVN Number: <strong>{farmer.bvn || "Not provided"}</strong>
          </p>
          <p className="mb-2">
            Gov ID:{" "}
            {farmer.govIdUrl ? (
              <a
                className="text-primary"
                href={farmer.govIdUrl}
                target="_blank"
              >
                View
              </a>
            ) : (
              "Not provided"
            )}
          </p>
          <p className="mb-2">
            NIN: <strong>{farmer.nin || "Not provided"}</strong>
          </p>
          <p className="mb-2">
            Farm Address: <strong>{farmer.farmAddress || "Not provided"}</strong>
          </p>
          <p className="mb-2">
            Selfie:{" "}
            {farmer.selfieUrl ? (
              <a
                className="text-primary"
                href={farmer.selfieUrl}
                target="_blank"
              >
                View
              </a>
            ) : (
              "Not provided"
            )}
          </p>
          <div className="mb-2">
            Farm Images:{" "}
            {farmer.farmImageUrls.length > 0 ? (
              <div className="mt-2 grid grid-cols-5 gap-2">
                {farmer.farmImageUrls.map((url, i) => (
                  <a key={url} href={url} target="_blank" className="block">
                    <img
                      src={url}
                      alt={`Farm ${i + 1}`}
                      className="w-full aspect-square object-cover rounded border"
                    />
                  </a>
                ))}
              </div>
            ) : (
              "Not provided"
            )}
          </div>
          {farmer.status === "pending" && (
            <button disabled className="mt-4 px-4 py-2 bg-gray-200 rounded">
              Submitted
            </button>
          )}
          {farmer.status === "approved" && (
            <div className="mt-4 px-4 py-2 bg-green-100 rounded">Approved</div>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded shadow space-y-4"
        >
          {farmer.status === "rejected" && (
            <div className="mb-2">
              <div className="mb-2 text-red-600">
                Rejected: {farmer.rejectionReason}
              </div>
              <p className="text-sm text-slate-600">
                You may re-upload corrected documents below and resubmit.
              </p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3">
              {error}
            </div>
          )}
          <div>
            <label className="block mb-1">BVN Number</label>
            <input
              type="text"
              value={bvn}
              onChange={(e) => setBvn(e.target.value)}
              placeholder="e.g. 22212345678"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block mb-1">BVN Document (image/pdf)</label>
            <input
              onChange={(e) => setBvnFile(e.target.files?.[0] ?? null)}
              accept="image/*,application/pdf"
              type="file"
            />
          </div>
          <div>
            <label className="block mb-1">NIN</label>
            <input
              type="text"
              value={nin}
              onChange={(e) => setNin(e.target.value)}
              placeholder="e.g. 12345678901"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block mb-1">Government ID (image/pdf)</label>
            <input
              onChange={(e) => setGovIdFile(e.target.files?.[0] ?? null)}
              accept="image/*,application/pdf"
              type="file"
            />
          </div>
          <div>
            <label className="block mb-1">Farm Address</label>
            <input
              type="text"
              value={farmAddress}
              onChange={(e) => setFarmAddress(e.target.value)}
              placeholder="e.g. 12 Kano Street, Kano"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block mb-1">Live Selfie (image)</label>
            <input
              onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
              accept="image/*"
              type="file"
            />
          </div>
          <div>
            <label className="block mb-1">
              Farm Proof Images — exactly 5 required
              {farmer.farmImageUrls.length === 5 && (
                <span className="text-xs text-slate-500"> (5 already on file — optional to replace)</span>
              )}
            </label>
            <input
              onChange={handleFarmImages}
              accept="image/*"
              type="file"
              multiple
            />
            {farmImageFiles.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {farmImageFiles.length} file(s) selected
              </p>
            )}
          </div>
          <button
            disabled={submitting}
            className="px-4 py-2 bg-emerald-700 text-white rounded disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit for Review"}
          </button>
        </form>
      )}
    </div>
  );
}
