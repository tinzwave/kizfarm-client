"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAdminFarmerVerificationById } from "@/lib/kizfarm/supabase-data";
import { adminReviewFarmer } from "@/lib/kizfarm/supabase-mutations";

export default function FarmerVerificationDetail({ id }: { id: string }) {
  const params = useParams();
  const actualId =
    id ||
    (params && (params as any).id) ||
    (typeof window !== "undefined"
      ? window.location.pathname.split("/").pop()
      : undefined);
  const [farmer, setFarmer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!actualId) {
          setError("Invalid farmer id");
          return;
        }
        const { res, payload } = await getAdminFarmerVerificationById(actualId);
        if (!res.ok) {
          setError(payload?.error || "Failed to load farmer");
        } else if (payload?.farmer) {
          setFarmer(payload.farmer);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load farmer");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [actualId]);

  const handleApprove = async () => {
    if (!farmer) return;
    setSubmitting(true);
    try {
      const { res, payload } = await adminReviewFarmer(farmer._id, true);
      if (!res.ok) throw new Error(payload?.error || "Approve failed");
      router.push("/admin/verify-farmers");
    } catch (err) {
      console.error(err);
      alert(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!farmer) return;
    if (!rejectionReason.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }
    setSubmitting(true);
    try {
      const { res, payload } = await adminReviewFarmer(farmer._id, false, rejectionReason);
      if (!res.ok) throw new Error(payload?.error || "Reject failed");
      router.push("/admin/verify-farmers");
    } catch (err) {
      console.error(err);
      alert(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center gap-2 p-6">
        <span className="material-symbols-outlined animate-spin">autorenew</span>
        Loading...
      </div>
    );
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!farmer) return <div className="p-6">Farmer not found</div>;

  const profileDetails = [
    ["Full Name", farmer.fullName || farmer.userId?.name],
    ["Farm Name", farmer.farmName],
    ["Farm Location", farmer.location],
    ["Farm Address", farmer.farmAddress],
    ["Phone Number", farmer.phone || farmer.userId?.phone],
    ["Farm Type", farmer.farmType],
    ["Email", farmer.userId?.email],
    ["Status", farmer.status],
  ];

  const farmImageUrls =
    Array.isArray(farmer.farmImageUrls) && farmer.farmImageUrls.length > 0
      ? farmer.farmImageUrls
      : farmer.farmImageUrl
        ? [farmer.farmImageUrl]
        : [];

  const mediaItems = [
    {
      label: "Farmer's Image",
      url: farmer.farmerImageUrl || farmer.selfieUrl,
    },
    {
      label: "Valid ID Image",
      url: farmer.validIdImageUrl || farmer.govIdUrl,
    },
  ];

  return (
    <div className="pt-16 p-6 max-w-container-max mx-auto">
      <div className="p-4 bg-white border rounded-lg shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="font-h2 text-h2">Verify Farmer</h2>
            <p className="text-sm text-slate-600 mt-1">
              Review submitted farmer details and proof images before making a
              decision.
            </p>

            <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
              <div className="space-y-6">
                <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
                    Farmer Profile
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profileDetails.map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-md border border-slate-200 bg-white p-3"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {label}
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {value || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
                    Verification Media
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {mediaItems.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg border border-slate-200 bg-white overflow-hidden"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 p-3">
                          <h4 className="text-sm font-semibold text-slate-700">
                            {item.label}
                          </h4>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              className="text-xs font-semibold text-primary underline"
                            >
                              Open
                            </a>
                          )}
                        </div>
                        <div className="aspect-[4/3] bg-slate-100">
                          {item.url ? (
                            <img
                              src={item.url}
                              alt={item.label}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-slate-500">
                              No image uploaded
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Farm Proof Images
                    </h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {farmImageUrls.length}/5 uploaded
                    </span>
                  </div>
                  {farmImageUrls.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                      {farmImageUrls.map((url: string, index: number) => (
                        <div
                          key={`${url}-${index}`}
                          className="rounded-lg border border-slate-200 bg-white overflow-hidden"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 p-3">
                            <h4 className="text-sm font-semibold text-slate-700">
                              Farm Image {index + 1}
                            </h4>
                            <a
                              href={url}
                              target="_blank"
                              className="text-xs font-semibold text-primary underline"
                            >
                              Open
                            </a>
                          </div>
                          <div className="aspect-square bg-slate-100">
                            <img
                              src={url}
                              alt={`Farm proof image ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-40 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500">
                      No farm proof images uploaded
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                      {farmer.farmerImageUrl || farmer.selfieUrl ? (
                        <img
                          src={farmer.farmerImageUrl || farmer.selfieUrl}
                          alt={farmer.fullName || farmer.userId?.name || "Farmer"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-slate-300 text-3xl">person</span>
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs uppercase tracking-wide text-slate-500">Farmer</h5>
                      <div className="text-sm font-semibold">
                        {farmer.fullName || farmer.userId?.name || "Unnamed"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="text-sm text-slate-600">
                      {farmer.userId?.email}
                    </div>
                    <div className="text-sm text-slate-600">
                      {farmer.phone || farmer.userId?.phone}
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4 sticky top-24">
                  <h4 className="font-label-sm text-label-sm text-slate-500 mb-2">
                    Review Decision
                  </h4>
                  <label className="text-[12px] text-slate-600 mb-2 block">
                    Rejection Reason (visible to farmer)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border p-2 text-sm"
                    placeholder="Enter a brief reason for rejection..."
                  />
                  <div className="mt-4 space-y-2">
                    <button
                      disabled={submitting}
                      onClick={handleApprove}
                      className="w-full py-3 bg-primary text-white rounded-md disabled:opacity-60"
                    >
                      {submitting ? "Working..." : "Approve"}
                    </button>
                    <button
                      disabled={submitting}
                      onClick={handleReject}
                      className="w-full py-3 bg-white border border-error text-error rounded-md disabled:opacity-60"
                    >
                      {submitting ? "Working..." : "Reject"}
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
