"use client";

import React, { useEffect, useRef, useState } from "react";
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

export default function IdentityVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<any>(null);
  const [farmAddress, setFarmAddress] = useState("");
  const [previews, setPreviews] = useState<Record<UploadKey, string | null>>({
    farmerImage: null,
    validIdImage: null,
  });
  const [farmImagePreviews, setFarmImagePreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<
    Record<UploadKey, File | null>
  >({
    farmerImage: null,
    validIdImage: null,
  });
  const [farmImages, setFarmImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const farmerImageRef = useRef<HTMLInputElement | null>(null);
  const validIdImageRef = useRef<HTMLInputElement | null>(null);
  const farmImagesRef = useRef<HTMLInputElement | null>(null);

  const refs: Record<UploadKey, React.RefObject<HTMLInputElement | null>> = {
    farmerImage: farmerImageRef,
    validIdImage: validIdImageRef,
  };

  const getExistingImage = (key: UploadKey) => {
    if (!farmer) return "";
    if (key === "farmerImage") return farmer.farmerImageUrl || farmer.selfieUrl || "";
    return farmer.validIdImageUrl || farmer.govIdUrl || "";
  };

  const getExistingFarmImages = () => {
    if (!farmer) return [];
    if (Array.isArray(farmer.farmImageUrls) && farmer.farmImageUrls.length > 0) {
      return farmer.farmImageUrls;
    }
    return farmer.farmImageUrl ? [farmer.farmImageUrl] : [];
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
      farmImagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [previews, farmImagePreviews]);

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

  const handleFarmImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length > 0 && files.length !== 5) {
      alert("Please select exactly 5 clear farm images.");
    }

    setFarmImages(files);
    setFarmImagePreviews((current) => {
      current.forEach((preview) => URL.revokeObjectURL(preview));
      return files.map((file) => URL.createObjectURL(file));
    });
  };

  const allowEdit =
    !farmer || farmer.status === "draft" || farmer.status === "rejected";

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!farmer) return;
    if (!allowEdit) return;

    const farmerImage = selectedFiles.farmerImage;
    const validIdImage = selectedFiles.validIdImage;
    const existingFarmImages = getExistingFarmImages();

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
    if (farmImages.length > 0 && farmImages.length !== 5) {
      alert("Please upload exactly 5 clear farm images.");
      return;
    }
    if (farmImages.length === 0 && existingFarmImages.length !== 5) {
      alert("Please upload exactly 5 clear farm images.");
      return;
    }

    setSubmitting(true);
    try {
      const { res, payload } = await submitFarmerVerification({
        farmAddress: farmAddress.trim(),
        farmerImageFile: farmerImage,
        validIdImageFile: validIdImage,
        farmImageFiles: farmImages.length === 5 ? farmImages : undefined,
      });
      if (!res.ok) throw new Error(payload?.error || "Upload failed");
      await fetchFarmerStatus();
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
                  {farmImagePreviews.length || getExistingFarmImages().length}/5
                  images
                </span>
              </div>
              <h3 className="text-headline-md font-headline-md mb-2">
                Farm Images
              </h3>
              <p className="text-body-md text-zinc-500 mb-md">
                Upload exactly 5 clear images showing the farm from different
                angles for physical proof.
              </p>
              <div className="relative rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 overflow-hidden p-3 min-h-[260px]">
                {(farmImagePreviews.length
                  ? farmImagePreviews
                  : getExistingFarmImages()
                ).length ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {(farmImagePreviews.length
                      ? farmImagePreviews
                      : getExistingFarmImages()
                    ).map((preview: string, index: number) => (
                      <div
                        key={`${preview}-${index}`}
                        className="relative aspect-square overflow-hidden rounded-md bg-white border border-zinc-200"
                      >
                        <img
                          src={preview}
                          className="h-full w-full object-cover"
                          alt={`Farm proof image ${index + 1}`}
                        />
                        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center text-center p-4">
                    <span className="material-symbols-outlined text-4xl text-zinc-300 mb-2">
                      add_photo_alternate
                    </span>
                    <span className="text-label-sm text-zinc-600">
                      Click to upload 5 farm images
                    </span>
                    <span className="text-label-xs text-zinc-400 mt-1">
                      Select exactly 5 PNG or JPG files
                    </span>
                  </div>
                )}
                <input
                  ref={farmImagesRef}
                  onChange={handleFarmImagesChange}
                  disabled={!allowEdit}
                  accept="image/*"
                  type="file"
                  multiple
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
          </section>

          <div className="lg:col-span-12 flex justify-end pt-md">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !allowEdit}
              className="bg-[#1B6D24] text-white px-xl h-12 rounded-lg font-label-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
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
    </div>
  );
}
