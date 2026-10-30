"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMyFarmerProfile } from "@/lib/kizfarm/supabase-data";
import { getCurrentProfile } from "@/lib/kizfarm/supabase-auth";
import {
  kycFileProblem,
  saveFarmerApplicationProgress,
  submitFarmerApplication,
} from "@/lib/kizfarm/supabase-mutations";
import {
  FARM_IMAGE_COUNT,
  FARM_TYPES,
  NIGERIAN_STATES,
  applicationChecklist,
  formatDateTime,
  statusMeta,
  type ApplicationStepKey,
} from "@/lib/kizfarm/farmer-application";
import FarmerApplicationMessages from "@/components/farmer-application-messages";

// Step 2 of becoming a farmer: everything an admin needs to verify the
// farm. The applicant can save part-way and come back; "Submit for review"
// only goes through once every item on the checklist is done (the
// database checks the same list -- see migration 0047).

type Slot = { file: File | null; path: string | null; preview: string | null };

const emptySlot = (): Slot => ({ file: null, path: null, preview: null });

// Which on-page section holds each checklist item, for "jump to" links.
const SECTION_FOR: Record<ApplicationStepKey, string> = {
  farm_name: "section-details",
  phone: "section-details",
  location: "section-details",
  farm_type: "section-details",
  farm_address: "section-details",
  farmer_image: "section-identity",
  valid_id_image: "section-identity",
  farm_images: "section-farm-photos",
};

export default function IdentityVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [farmer, setFarmer] = useState<any>(null);
  const [fullName, setFullName] = useState("");

  const [farmName, setFarmName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [farmType, setFarmType] = useState("");
  const [farmAddress, setFarmAddress] = useState("");

  const [farmerImage, setFarmerImage] = useState<Slot>(emptySlot());
  const [validIdImage, setValidIdImage] = useState<Slot>(emptySlot());
  const [farmSlots, setFarmSlots] = useState<Slot[]>(() => Array.from({ length: FARM_IMAGE_COUNT }, emptySlot));
  const [farmSlotsChanged, setFarmSlotsChanged] = useState(false);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<"save" | "submit" | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState("");
  const [savedNotice, setSavedNotice] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);

  const createdPreviews = useRef<string[]>([]);
  const objectUrl = (file: File) => {
    const url = URL.createObjectURL(file);
    createdPreviews.current.push(url);
    return url;
  };
  useEffect(() => () => createdPreviews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const hydrate = useCallback((f: any) => {
    setFarmer(f);
    setFarmName(f.farmName || "");
    setPhone(f.phone || "");
    setLocation(f.location || "");
    setFarmType(f.farmType || "");
    setFarmAddress(f.farmAddress || "");
    setFarmerImage({ file: null, path: null, preview: f.farmerImageUrl || f.selfieUrl || null });
    setValidIdImage({ file: null, path: null, preview: f.validIdImageUrl || f.govIdUrl || null });
    const paths: (string | null)[] = f.farmImagePaths || [];
    const urls: (string | null)[] = f.farmImageUrls || [];
    setFarmSlots(
      Array.from({ length: FARM_IMAGE_COUNT }, (_, i) => ({
        file: null,
        path: paths[i] || null,
        preview: paths[i] ? urls[i] || null : null,
      })),
    );
    setFarmSlotsChanged(false);
    setDirty(false);
  }, []);

  const load = useCallback(async () => {
    try {
      const [{ res, payload }, profile] = await Promise.all([getMyFarmerProfile(), getCurrentProfile()]);
      if (!res.ok) {
        setLoadError(payload?.error || "Could not load your application.");
        return;
      }
      if (!payload?.farmer) {
        router.replace("/farmer/become");
        return;
      }
      setFullName(payload.farmer.fullName || profile?.name || "");
      hydrate(payload.farmer);
    } catch {
      setLoadError("Could not connect. Check your internet connection and refresh.");
    } finally {
      setLoading(false);
    }
  }, [hydrate, router]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // Warn before leaving with unsaved uploads/edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const status: string = farmer?.status || "draft";
  const editable = status === "draft" || status === "rejected";
  const meta = statusMeta(status);

  // Live checklist from what's on screen (saved or just picked).
  const checklist = useMemo(
    () =>
      applicationChecklist({
        farmName,
        phone,
        location,
        farmType,
        farmAddress,
        farmerImageUrl: farmerImage.file ? "new" : farmerImage.preview,
        validIdImageUrl: validIdImage.file ? "new" : validIdImage.preview,
        farmImageUrls: farmSlots.map((s) => (s.file ? "new" : s.path)),
      }),
    [farmName, phone, location, farmType, farmAddress, farmerImage, validIdImage, farmSlots],
  );
  const missing = checklist.filter((s) => !s.done);
  const doneCount = checklist.length - missing.length;
  const percent = Math.round((doneCount / checklist.length) * 100);
  const isMissing = (key: ApplicationStepKey) => showErrors && missing.some((m) => m.key === key);
  const phoneInvalid = phone.trim() !== "" && !/^[0-9]{7,15}$/.test(phone.trim());

  const touch = () => {
    setDirty(true);
    setSavedNotice("");
  };

  const pickSingle = (setter: React.Dispatch<React.SetStateAction<Slot>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = kycFileProblem(file);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError("");
    setter({ file, path: null, preview: objectUrl(file) });
    touch();
  };

  const pickFarmSlot = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = kycFileProblem(file);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError("");
    setFarmSlots((cur) => cur.map((s, i) => (i === index ? { file, path: null, preview: objectUrl(file) } : s)));
    setFarmSlotsChanged(true);
    touch();
  };

  const clearFarmSlot = (index: number) => {
    setFarmSlots((cur) => cur.map((s, i) => (i === index ? emptySlot() : s)));
    setFarmSlotsChanged(true);
    touch();
  };

  const persist = async () => {
    const { res, payload } = await saveFarmerApplicationProgress({
      farmName: farmName.trim(),
      phone: phone.trim(),
      location,
      farmType,
      farmAddress: farmAddress.trim(),
      farmerImageFile: farmerImage.file,
      validIdImageFile: validIdImage.file,
      farmImageSlots: farmSlotsChanged ? farmSlots.map((s) => s.file || s.path || null) : undefined,
    });
    if (!res.ok) throw new Error(payload?.error || "Could not save your application.");
  };

  const scrollTo = (key: ApplicationStepKey) =>
    document.getElementById(SECTION_FOR[key])?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleSave = async () => {
    if (!editable || saving) return;
    if (phoneInvalid) {
      setShowErrors(true);
      setFormError("Phone number must be 7 to 15 digits, numbers only.");
      return;
    }
    setSaving("save");
    setFormError("");
    try {
      await persist();
      await load();
      setSavedNotice(
        missing.length === 0
          ? "Saved. Everything is filled in — submit it for review when you're ready."
          : `Saved. ${missing.length} item${missing.length === 1 ? "" : "s"} still to do before you can submit.`,
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(null);
    }
  };

  const handleSubmit = async () => {
    if (!editable || saving) return;
    setShowErrors(true);
    if (missing.length > 0 || phoneInvalid) {
      setFormError(
        phoneInvalid
          ? "Phone number must be 7 to 15 digits, numbers only."
          : `Your application is not complete yet. Still missing: ${missing.map((m) => m.label).join(", ")}.`,
      );
      if (missing[0]) scrollTo(missing[0].key);
      return;
    }
    setSaving("submit");
    setFormError("");
    try {
      await persist();
      const { res, payload } = await submitFarmerApplication();
      if (!res.ok) throw new Error(payload?.error || "Could not submit your application.");
      await load();
      setJustSubmitted(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
      // Whatever was saved before the failure is now on the server.
      await load();
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-zinc-500">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-[#1B6D24]" />
        Loading your application…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-6 pt-32 text-center">
        <span className="material-symbols-outlined text-4xl text-red-500">cloud_off</span>
        <p className="mt-2 text-sm text-slate-700">{loadError}</p>
        <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-[#1B6D24] px-4 py-2 text-sm font-semibold text-white">
          Try again
        </button>
      </div>
    );
  }

  const inputClass = (bad: boolean) =>
    `h-12 w-full rounded-lg border bg-white px-4 text-sm outline-none transition focus:ring-2 focus:ring-[#1B6D24]/15 disabled:bg-zinc-50 disabled:text-zinc-500 ${
      bad ? "border-red-400 focus:border-red-500" : "border-zinc-300 focus:border-[#1B6D24]"
    }`;

  const missingTag = (key: ApplicationStepKey) =>
    isMissing(key) ? <span className="ml-2 text-xs font-semibold text-red-600">Required</span> : null;

  return (
    <div className="min-h-screen bg-[#f8faf8] pb-28 text-on-surface">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          <Link href="/buyer/dashboard" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <img alt="KIZ FARM" className="h-9 w-auto object-contain" src="/logo.jpeg" />
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${meta.badge}`}>
          <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
          {meta.label}
        </span>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
        <ol className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <li className="flex items-center gap-1.5 text-[#1B6D24]">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>Start
          </li>
          <span className="h-px w-6 bg-zinc-300" />
          <li className={`flex items-center gap-1.5 ${status === "draft" || status === "rejected" ? "text-slate-900" : "text-[#1B6D24]"}`}>
            <span className="material-symbols-outlined text-[18px]">{status === "draft" || status === "rejected" ? "radio_button_checked" : "check_circle"}</span>
            Farm details &amp; documents
          </li>
          <span className="h-px w-6 bg-zinc-300" />
          <li className={`flex items-center gap-1.5 ${status === "pending" ? "text-amber-700" : status === "approved" ? "text-[#1B6D24]" : ""}`}>
            <span className="material-symbols-outlined text-[18px]">{status === "approved" ? "check_circle" : status === "pending" ? "hourglass_top" : "radio_button_unchecked"}</span>
            Admin review
          </li>
        </ol>

        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Farmer application</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          We check every farm before it can sell on KIZ FARM, so buyers know they&apos;re dealing with real farmers. Fill in each item below — you can save and come back any time.
        </p>

        {/* Status panel */}
        <div className="mt-6">
          {status === "draft" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-amber-950">
                    <span className="material-symbols-outlined">edit_note</span>
                    {missing.length > 0 ? "Your application is not complete yet" : "Ready to submit"}
                  </h2>
                  <p className="mt-1 text-sm text-amber-900">
                    {missing.length > 0
                      ? `It hasn't been sent to the admin yet. Complete the ${missing.length} remaining item${missing.length === 1 ? "" : "s"}, then press “Submit for review”.`
                      : "Everything is filled in. Press “Submit for review” to send it to the KIZ FARM team."}
                  </p>
                </div>
                <span className="text-sm font-bold text-amber-950">{percent}% done</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-200/70">
                <div className="h-full rounded-full bg-[#1B6D24] transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}
          {status === "pending" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-amber-950">
                <span className="material-symbols-outlined">hourglass_top</span>
                Submitted — waiting for admin review
              </h2>
              <p className="mt-1 text-sm text-amber-900">
                Sent on {formatDateTime(farmer?.submittedAt)}. An admin is checking your details. You&apos;ll get a notification as soon as there&apos;s a decision, and you can keep buying on KIZ FARM in the meantime. Your application can&apos;t be edited while it&apos;s being reviewed.
              </p>
            </div>
          )}
          {status === "rejected" && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-rose-900">
                <span className="material-symbols-outlined">error</span>
                Your application needs changes
              </h2>
              <p className="mt-2 rounded-lg bg-white/70 p-3 text-sm text-rose-900">
                <span className="font-semibold">Reason from the admin: </span>
                {farmer?.rejectionReason || "No reason was given."}
              </p>
              <p className="mt-2 text-sm text-rose-800">Fix the items below, then press “Resubmit for review”.</p>
            </div>
          )}
          {status === "approved" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-emerald-900">
                <span className="material-symbols-outlined">verified</span>
                You&apos;re a verified farmer
              </h2>
              <Link href="/farmer/dashboard" className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#1B6D24] px-4 py-2 text-sm font-semibold text-white">
                Open Farmer Dashboard
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            {/* Farm details */}
            <section id="section-details" className="scroll-mt-24 rounded-xl border border-zinc-200 bg-white p-5 md:p-6">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
                <span className="material-symbols-outlined text-[#1B6D24]">agriculture</span>Farm details
              </h2>
              <p className="mb-5 text-sm text-zinc-500">This is what the admin checks and what buyers see on your listings.</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Full name</label>
                  <input className={inputClass(false)} value={fullName} disabled readOnly />
                  <p className="mt-1 text-xs text-zinc-500">From your account. Change it in your profile.</p>
                </div>
                <div>
                  <label htmlFor="farm_name" className="mb-1 block text-sm font-semibold">
                    Farm name{missingTag("farm_name")}
                  </label>
                  <input
                    id="farm_name"
                    className={inputClass(isMissing("farm_name"))}
                    value={farmName}
                    disabled={!editable}
                    placeholder="e.g. Green Valley Farms"
                    onChange={(e) => {
                      setFarmName(e.target.value);
                      touch();
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1 block text-sm font-semibold">
                    Phone number{missingTag("phone")}
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    className={inputClass(isMissing("phone") || phoneInvalid)}
                    value={phone}
                    disabled={!editable}
                    placeholder="08012345678"
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\s/g, ""));
                      touch();
                    }}
                  />
                  {phoneInvalid && <p className="mt-1 text-xs font-medium text-red-600">Numbers only, 7 to 15 digits.</p>}
                </div>
                <div>
                  <label htmlFor="location" className="mb-1 block text-sm font-semibold">
                    Farm state{missingTag("location")}
                  </label>
                  <select
                    id="location"
                    className={inputClass(isMissing("location"))}
                    value={location}
                    disabled={!editable}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      touch();
                    }}
                  >
                    <option value="">Select state</option>
                    {/* Keep a value saved before this list existed selectable. */}
                    {location && !NIGERIAN_STATES.includes(location) && <option value={location}>{location}</option>}
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="farm_type" className="mb-1 block text-sm font-semibold">
                    Farm type{missingTag("farm_type")}
                  </label>
                  <select
                    id="farm_type"
                    className={inputClass(isMissing("farm_type"))}
                    value={farmType}
                    disabled={!editable}
                    onChange={(e) => {
                      setFarmType(e.target.value);
                      touch();
                    }}
                  >
                    <option value="">Select type</option>
                    {FARM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="farm_address" className="mb-1 block text-sm font-semibold">
                    Farm address{missingTag("farm_address")}
                  </label>
                  <textarea
                    id="farm_address"
                    rows={3}
                    className={`${inputClass(isMissing("farm_address"))} h-auto py-3`}
                    value={farmAddress}
                    disabled={!editable}
                    placeholder="Street / village, town, LGA — the full physical address of the farm"
                    onChange={(e) => {
                      setFarmAddress(e.target.value);
                      touch();
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Identity */}
            <section id="section-identity" className="scroll-mt-24 rounded-xl border border-zinc-200 bg-white p-5 md:p-6">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
                <span className="material-symbols-outlined text-[#1B6D24]">badge</span>Your identity
              </h2>
              <p className="mb-5 text-sm text-zinc-500">Only KIZ FARM admins can see these. JPG or PNG, up to 10MB each.</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(
                  [
                    { key: "farmer_image", title: "Your photo", helper: "A clear, recent photo of your face.", icon: "face", slot: farmerImage, set: setFarmerImage },
                    { key: "valid_id_image", title: "Valid ID", helper: "Driver's licence, voter's card, NIN slip or international passport.", icon: "badge", slot: validIdImage, set: setValidIdImage },
                  ] as const
                ).map((item) => (
                  <div key={item.key} className={`rounded-xl border p-4 ${isMissing(item.key) ? "border-red-300 bg-red-50/40" : "border-zinc-200"}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">
                        {item.title}
                        {missingTag(item.key)}
                      </h3>
                      {item.slot.preview && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-[#1B6D24]">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          {item.slot.file ? "Ready to save" : "Uploaded"}
                        </span>
                      )}
                    </div>
                    <p className="mb-3 text-xs text-zinc-500">{item.helper}</p>
                    <label className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 ${editable ? "cursor-pointer hover:border-[#1B6D24]" : "cursor-default"}`}>
                      {item.slot.preview ? (
                        <img src={item.slot.preview} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex flex-col items-center p-4 text-center text-zinc-500">
                          <span className="material-symbols-outlined mb-1 text-4xl text-zinc-300">{item.icon}</span>
                          <span className="text-sm font-medium">Tap to upload</span>
                        </span>
                      )}
                      {editable && item.slot.preview && (
                        <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white">Change</span>
                      )}
                      <input type="file" accept="image/*" className="hidden" disabled={!editable} onChange={pickSingle(item.set)} />
                    </label>
                  </div>
                ))}
              </div>
            </section>

            {/* Farm photos */}
            <section
              id="section-farm-photos"
              className={`scroll-mt-24 rounded-xl border bg-white p-5 md:p-6 ${isMissing("farm_images") ? "border-red-300" : "border-zinc-200"}`}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <span className="material-symbols-outlined text-[#1B6D24]">photo_library</span>Farm photos
                  {missingTag("farm_images")}
                </h2>
                <span className="text-sm font-semibold text-zinc-600">
                  {farmSlots.filter((s) => s.file || s.path).length}/{FARM_IMAGE_COUNT}
                </span>
              </div>
              <p className="mb-5 text-sm text-zinc-500">
                {FARM_IMAGE_COUNT} clear photos of the farm from different angles — the land, crops or animals, and any buildings or signboard.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {farmSlots.map((slot, i) => (
                  <div key={i} className="relative">
                    <label className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 ${editable ? "cursor-pointer hover:border-[#1B6D24]" : "cursor-default"}`}>
                      {slot.preview ? (
                        <img src={slot.preview} alt={`Farm photo ${i + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex flex-col items-center text-zinc-500">
                          <span className="material-symbols-outlined text-2xl text-zinc-300">add_photo_alternate</span>
                          <span className="text-xs">Photo {i + 1}</span>
                        </span>
                      )}
                      <input type="file" accept="image/*" className="hidden" disabled={!editable} onChange={pickFarmSlot(i)} />
                    </label>
                    {editable && slot.preview && (
                      <button
                        type="button"
                        onClick={() => clearFarmSlot(i)}
                        aria-label={`Remove farm photo ${i + 1}`}
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {farmer?._id && <FarmerApplicationMessages farmerId={farmer._id} viewer="farmer" />}
          </div>

          {/* Checklist */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h3 className="mb-1 font-bold">Checklist</h3>
              <p className="mb-4 text-xs text-zinc-500">
                {doneCount} of {checklist.length} done
              </p>
              <ul className="space-y-2.5">
                {checklist.map((step) => (
                  <li key={step.key}>
                    <button type="button" onClick={() => scrollTo(step.key)} className="flex w-full items-start gap-2 text-left">
                      <span className={`material-symbols-outlined text-[20px] ${step.done ? "text-[#1B6D24]" : "text-zinc-300"}`}>
                        {step.done ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      <span>
                        <span className={`block text-sm ${step.done ? "text-zinc-700" : "font-semibold text-slate-900"}`}>{step.label}</span>
                        {!step.done && <span className="block text-xs text-zinc-500">{step.hint}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* Action bar */}
      {editable && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="min-h-5 text-sm" aria-live="polite">
              {formError ? (
                <span className="font-medium text-red-600">{formError}</span>
              ) : savedNotice ? (
                <span className="text-emerald-700">{savedNotice}</span>
              ) : dirty ? (
                <span className="text-zinc-500">You have unsaved changes.</span>
              ) : (
                <span className="text-zinc-500">
                  {missing.length === 0 ? "All items done." : `${missing.length} item${missing.length === 1 ? "" : "s"} left.`}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!!saving || !dirty}
                className="h-11 flex-1 rounded-lg border border-zinc-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-zinc-50 disabled:opacity-50 md:flex-none"
              >
                {saving === "save" ? "Saving…" : "Save progress"}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!!saving}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#1B6D24] px-6 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60 md:flex-none"
              >
                {saving === "submit" && <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>}
                {saving === "submit" ? "Submitting…" : status === "rejected" ? "Resubmit for review" : "Submit for review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {justSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <span className="material-symbols-outlined text-3xl text-[#1B6D24]">task_alt</span>
            </div>
            <h3 className="mb-2 text-xl font-bold">Application submitted</h3>
            <p className="mb-6 text-sm text-zinc-600">
              Thank you! The KIZ FARM team will review your farm and you&apos;ll get a notification with the decision. If anything is unclear, an admin may message you here.
            </p>
            <Link
              href="/buyer/dashboard"
              className="flex h-12 w-full items-center justify-center rounded-lg bg-[#1B6D24] text-sm font-semibold text-white hover:brightness-110"
            >
              Back to my dashboard
            </Link>
            <button type="button" onClick={() => setJustSubmitted(false)} className="mt-3 text-sm font-semibold text-zinc-500 hover:text-zinc-800">
              View my application
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
