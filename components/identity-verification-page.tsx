"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMyFarmerProfile } from "@/lib/kizfarm/supabase-data";
import { submitFarmerVerification } from "@/lib/kizfarm/supabase-mutations";

type UploadKey = "farmerImage" | "validIdImage";

const uploadCopy: Record<UploadKey, { title: string; helper: string; icon: string }> = {
  farmerImage: {
    title: "Farmer's Image",
    helper: "Upload a clear image of yourself for profile verification.",
    icon: "face",
  },
  validIdImage: {
    title: "Valid ID Image",
    helper: "Driver's License, Voter's Card, or International Passport.",
    icon: "badge",
  },
};

const FARM_IMAGE_SLOTS = 5;

export default function IdentityVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<any>(null);
  const [farmAddress, setFarmAddress] = useState("");
  const [previews, setPreviews] = useState<Record<UploadKey, string | null>>({
    farmerImage: null,
    validIdImage: null,
  });
  const [selectedFiles, setSelectedFiles] = useState<
    Record<UploadKey, File | null>
  >({
    farmerImage: null,
    validIdImage: null,
  });
  // Each of the 5 farm-image slots is independently clickable/replaceable,
  // matching the farmerImage/validIdImage pattern above -- rather than one
  // input requiring all 5 files picked at once.
  const [farmImageSlots, setFarmImageSlots] = useState<(File | null)[]>(
    Array(FARM_IMAGE_SLOTS).fill(null),
  );
  const [farmImageSlotPreviews, setFarmImageSlotPreviews] = useState<
    (string | null)[]
  >(Array(FARM_IMAGE_SLOTS).fill(null));
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const farmerImageRef = useRef<HTMLInputElement | null>(null);
  const validIdImageRef = useRef<HTMLInputElement | null>(null);
  const farmImageRefs = useRef<(HTMLInputElement | null)[]>([]);

  const refs: Record<UploadKey, React.RefObject<HTMLInputElement | null>> = {
    farmerImage: farmerImageRef,
    validIdImage: validIdImageRef,
  };

  const getExistingImage = (key: UploadKey) => {
    if (!farmer) return "";
    if (key === "farmerImage") return farmer.farmerImageUrl || farmer.selfieUrl || "";
    return farmer.validIdImageUrl || farmer.govIdUrl || "";
  };

  // Signed URLs, for display only.
  const getExistingFarmImages = (): string[] => {
    if (!farmer) return [];
    if (Array.isArray(farmer.farmImageUrls) && farmer.farmImageUrls.length > 0) {
      return farmer.farmImageUrls;
    }
    return farmer.farmImageUrl ? [farmer.farmImageUrl] : [];
  };

  // Raw storage paths -- needed when resubmitting so an unchanged slot can
  // be sent back as-is. A signed display URL can't be reused as a path
  // (the signing token isn't a valid object path for the next sign call).
  const getExistingFarmImagePaths = (): string[] => {
    if (!farmer) return [];
    return Array.isArray(farmer.farmImagePaths) ? farmer.farmImagePaths : [];
  };

  const fetchFarmerStatus = async () => {
    try {
      const { payload } = await getMyFarmerProfile();
      if (!payload?.farmer) {
        router.push("/farmer/become");
        return;
      }
      setFarmer(payload.farmer);
      setFarmAddress(payload.farmer?.farmAddress || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      setLoading(true);
      fetchFarmerStatus();
    });
  }, [router]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
      farmImageSlotPreviews.forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [previews, farmImageSlotPreviews]);

  const handleFileChange =
    (key: UploadKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.target.files?.[0] || null;
      setSelectedFiles((current) => ({ ...current, [key]: file }));
      setPreviews((current) => {
        if (current[key]) URL.revokeObjectURL(current[key] as string);
        return {
          ...current,
          [key]: file && file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : null,
        };
      });
    };

  const handleFarmImageSlotChange =
    (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.target.files?.[0] || null;
      if (file && !file.type.startsWith("image/")) return;
      setFarmImageSlots((current) => {
        const next = [...current];
        next[index] = file;
        return next;
      });
      setFarmImageSlotPreviews((current) => {
        if (current[index]) URL.revokeObjectURL(current[index] as string);
        const next = [...current];
        next[index] = file ? URL.createObjectURL(file) : null;
        return next;
      });
    };

  const existingFarmImages = getExistingFarmImages();
  const existingFarmImagePaths = getExistingFarmImagePaths();
  const farmImagesFilledCount = Array.from({ length: FARM_IMAGE_SLOTS }).filter(
    (_, i) => farmImageSlots[i] || existingFarmImages[i],
  ).length;

  const allowEdit =
    !farmer || farmer.status === "draft" || farmer.status === "rejected";

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!farmer) return;
    if (!allowEdit) return;

    const farmerImage = selectedFiles.farmerImage;
    const validIdImage = selectedFiles.validIdImage;

    if (!farmAddress.trim()) {
      alert("Farm address is required.");
      return;
    }
    if (!farmerImage && !getExistingImage("farmerImage")) {
      alert("Farmer's image is required.");
      return;
    }
    if (!validIdImage && !getExistingImage("validIdImage")) {
      alert("Valid ID image is required.");
      return;
    }
    if (farmImagesFilledCount !== FARM_IMAGE_SLOTS) {
      alert("Please upload all 5 farm proof images.");
      return;
    }

    // Only resend the farm-image array if at least one slot actually
    // changed -- otherwise omit it so the RPC keeps the existing 5 as-is.
    const anyFarmImageChanged = farmImageSlots.some((f) => f !== null);
    const farmImagePayload = anyFarmImageChanged
      ? Array.from(
          { length: FARM_IMAGE_SLOTS },
          (_, i) => farmImageSlots[i] || existingFarmImagePaths[i],
        )
      : undefined;

    setSubmitting(true);
    try {
      const { res, payload } = await submitFarmerVerification({
        farmAddress: farmAddress.trim(),
        farmerImageFile: farmerImage,
        validIdImageFile: validIdImage,
        farmImageFiles: farmImagePayload,
      });
      if (!res.ok) throw new Error(payload?.error || "Upload failed");
      await fetchFarmerStatus();
      setJustSubmitted(true);
    } catch (err) {
      alert(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="pt-32 text-center">Loading verification...</div>;
  }

  const statusLabel = farmer?.status
    ? farmer.status.charAt(0).toUpperCase() + farmer.status.slice(1)
    : "Draft";

  return (
    <div className="bg-white font-body-md text-on-surface min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 h-16 w-full bg-white/90 backdrop-blur-md border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <img
            alt="KIZ FARM"
            className="h-10 w-auto object-contain"
            src="/logo.jpeg"
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl border">
          <span
            className={`material-symbols-outlined ${
              farmer?.status === "approved"
                ? "text-emerald-700"
                : farmer?.status === "rejected"
                  ? "text-red-700"
                  : "text-amber-700"
            }`}
          >
            {farmer?.status === "approved"
              ? "verified"
              : farmer?.status === "rejected"
                ? "error"
                : "pending"}
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] text-zinc-500 uppercase">
              Current Status
            </span>
            <span className="text-sm font-bold">{statusLabel}</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto min-h-[calc(100vh-64px)] p-6 md:p-margin">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
          <div>
            <nav className="flex items-center gap-2 text-zinc-400 mb-2">
              <span className="text-label-sm font-label-sm uppercase">
                Account
              </span>
              <span className="material-symbols-outlined text-[16px]">
                chevron_right
              </span>
              <span className="text-label-sm font-label-sm uppercase text-primary">
                Verification
              </span>
            </nav>
            <h1 className="text-headline-lg font-headline-lg">
              Identity Verification
            </h1>
            <p className="text-body-lg text-zinc-500 max-w-2xl">
              Submit your farm address, personal image, valid ID image, and 5
              clear farm proof images for admin review.
            </p>
          </div>
        </div>

        {farmer?.status === "rejected" && (
          <div className="mb-md bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-800">
            <div className="font-semibold mb-1">Application Rejected</div>
            <div>{farmer.rejectionReason || "No reason provided by the admin."}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <section className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-xl p-md">
            <div className="flex items-center gap-2 mb-md">
              <span className="material-symbols-outlined text-primary">
                location_on
              </span>
              <h2 className="text-headline-md font-headline-md">
                Farm Address
              </h2>
            </div>
            <textarea
              className="w-full min-h-48 bg-white border border-zinc-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              placeholder="Enter the full physical address of your farm"
              value={farmAddress}
              onChange={(e) => setFarmAddress(e.target.value)}
              disabled={!allowEdit}
            />
          </section>

          <section className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-md">
            {(Object.keys(uploadCopy) as UploadKey[]).map((key) => {
              const existing = getExistingImage(key);
              const preview = previews[key] || existing;
              return (
                <div
                  key={key}
                  className="bg-white border border-[#E5E7EB] rounded-xl p-md flex flex-col"
                >
                  <div className="flex justify-between items-start mb-md">
                    <div className="p-3 bg-green-50 rounded-xl text-primary">
                      <span className="material-symbols-outlined">
                        {uploadCopy[key].icon}
                      </span>
                    </div>
                    {existing && (
                      <a
                        className="text-label-xs text-primary underline"
                        href={existing}
                        target="_blank"
                      >
                        View
                      </a>
                    )}
                  </div>
                  <h3 className="text-headline-md font-headline-md mb-2">
                    {uploadCopy[key].title}
                  </h3>
                  <p className="text-body-md text-zinc-500 mb-md">
                    {uploadCopy[key].helper}
                  </p>
                  <div className="relative aspect-[4/3] rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 overflow-hidden flex items-center justify-center">
                    {preview ? (
                      <img
                        src={preview}
                        className="h-full w-full object-cover"
                        alt={`${uploadCopy[key].title} preview`}
                      />
                    ) : (
                      <div className="flex flex-col items-center text-center p-4">
                        <span className="material-symbols-outlined text-4xl text-zinc-300 mb-2">
                          cloud_upload
                        </span>
                        <span className="text-label-sm text-zinc-600">
                          Click to upload
                        </span>
                        <span className="text-label-xs text-zinc-400 mt-1">
                          PNG or JPG up to 10MB
                        </span>
                      </div>
                    )}
                    <input
                      ref={refs[key]}
                      onChange={handleFileChange(key)}
                      disabled={!allowEdit}
                      accept="image/*"
                      type="file"
                      className="absolute inset-0 opacity-0"
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: allowEdit ? "pointer" : "not-allowed" }}
                    />
                    {submitting && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <span className="font-semibold text-sm text-zinc-600">
                          Uploading...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="bg-white border border-[#E5E7EB] rounded-xl p-md flex flex-col md:col-span-2">
              <div className="flex justify-between items-start mb-md">
                <div className="p-3 bg-green-50 rounded-xl text-primary">
                  <span className="material-symbols-outlined">agriculture</span>
                </div>
                <span className="text-label-xs font-label-xs text-zinc-500 uppercase">
                  {farmImagesFilledCount}/{FARM_IMAGE_SLOTS} images
                </span>
              </div>
              <h3 className="text-headline-md font-headline-md mb-2">
                Farm Images
              </h3>
              <p className="text-body-md text-zinc-500 mb-md">
                Upload 5 clear images showing the farm from different angles.
                Click each box to add its image -- all at once or one at a
                time, in any order.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Array.from({ length: FARM_IMAGE_SLOTS }).map((_, index) => {
                  const preview =
                    farmImageSlotPreviews[index] || existingFarmImages[index] || null;
                  return (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 overflow-hidden flex items-center justify-center"
                    >
                      {preview ? (
                        <img
                          src={preview}
                          className="h-full w-full object-cover"
                          alt={`Farm proof image ${index + 1}`}
                        />
                      ) : (
                        <div className="flex flex-col items-center text-center p-2">
                          <span className="material-symbols-outlined text-2xl text-zinc-300 mb-1">
                            add_photo_alternate
                          </span>
                          <span className="text-label-xs text-zinc-500">
                            Image {index + 1}
                          </span>
                        </div>
                      )}
                      <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <input
                        ref={(el) => {
                          farmImageRefs.current[index] = el;
                        }}
                        onChange={handleFarmImageSlotChange(index)}
                        disabled={!allowEdit}
                        accept="image/*"
                        type="file"
                        className="absolute inset-0 opacity-0"
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: allowEdit ? "pointer" : "not-allowed" }}
                      />
                      {submitting && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="material-symbols-outlined animate-spin text-lg text-zinc-500">
                            autorenew
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="lg:col-span-12 flex justify-end pt-md">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !allowEdit}
              className="bg-[#1B6D24] text-white px-xl h-12 rounded-lg font-label-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <span className="material-symbols-outlined animate-spin text-lg">
                  autorenew
                </span>
              )}
              {submitting
                ? "Submitting..."
                : farmer?.status === "pending"
                  ? "Submitted"
                  : farmer?.status === "approved"
                    ? "Approved"
                    : farmer?.status === "rejected"
                      ? "Edit & Resubmit"
                      : "Submit for Review"}
            </button>
          </div>
        </div>
      </main>

      {justSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <span className="material-symbols-outlined text-3xl text-primary">
                task_alt
              </span>
            </div>
            <h3 className="text-headline-md font-headline-md mb-2">
              Application Submitted
            </h3>
            <p className="text-body-md text-zinc-500 mb-6">
              Your farmer application has been submitted. Our admin team will
              review it and get back to you.
            </p>
            <Link
              href="/buyer/dashboard"
              className="flex w-full h-12 items-center justify-center bg-[#1B6D24] text-white rounded-lg font-label-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
            >
              Back to Buyer Dashboard
            </Link>
            <p className="text-label-xs text-zinc-400 mt-4">
              Keep an eye on your dashboard -- it will update once admin
              reviews your application.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
