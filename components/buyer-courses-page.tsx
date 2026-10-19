"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import React, { useEffect, useMemo, useState } from "react";
import { getBuyerBrowseCourses, getMyCreatedCourses, getMySubscriptions, getCourseContent, getCourseCreatorContact } from "@/lib/kizfarm/supabase-data";
import { getCurrentProfile } from "@/lib/kizfarm/supabase-auth";
import { createBuyerCourse, updateBuyerCourse, saveCreatorBankDetails, saveCreatorProfile, uploadCourseCover } from "@/lib/kizfarm/supabase-mutations";
import LearningRichEditor from "./learning-rich-editor";
import CourseCoverInput from "./course-cover-input";
import { CreatorAvatar } from "./course-creator-card";
import type { CreatorProfile } from "@/lib/kizfarm/supabase-data";

type ReviewStatus = "draft" | "pending" | "approved" | "rejected";

interface BuyerCourse {
  _id: string;
  title: string;
  description: string;
  price: number;
  finalPrice?: number;
  commission?: number;
  content?: string;
  coverImage?: string;
  status?: ReviewStatus;
  rejectionReason?: string;
  createdAt?: string;
  creatorProfile?: CreatorProfile;
}

interface Subscription {
  _id: string;
  course: BuyerCourse;
  paidAt: string;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

// Mirrors the courses_creator_whatsapp_format check in the database.
function isValidWhatsapp(value: string) {
  const digits = onlyDigits(value).length;
  return /^\+?\d[\d -]*\d$/.test(value) && digits >= 7 && digits <= 15;
}

// Database/network errors are meaningless to a farmer -- translate the
// common ones and fall back to a plain retry message.
function friendlyCourseError(error?: string) {
  const text = (error || "").toLowerCase();
  if (!text) return "Could not create the course. Please try again.";
  if (text.includes("not authenticated") || text.includes("jwt")) return "Your session has expired. Log in again, then submit the course.";
  if (text.includes("failed to fetch") || text.includes("network") || text.includes("timeout")) {
    return "Could not reach KizFarm. Check your internet connection and try again.";
  }
  if (text.includes("creator_whatsapp")) return "Enter a valid WhatsApp number, e.g. +234 801 234 5678, or leave it empty.";
  if (text.includes("row-level security") || text.includes("permission denied")) {
    return "Your account isn't allowed to create courses. Contact KizFarm support.";
  }
  return `Could not create the course: ${error}`;
}

const emptyCourse = {
  title: "",
  description: "",
  price: "",
  content: "<h2>Course overview</h2><p>Add lessons, images, and YouTube videos here.</p>",
  coverImage: null as string | null,
  whatsapp: "",
};

export default function BuyerCoursesPage() {
  // Farmers reach this page at /learning/my-courses and buyers at
  // /buyer/courses; course links come back to whichever one they used.
  const returnTo = usePathname() || "/buyer/courses";
  const [activeTab, setActiveTab] = useState<"browse" | "mine" | "create">("browse");
  const [courses, setCourses] = useState<BuyerCourse[]>([]);
  const [myCourses, setMyCourses] = useState<BuyerCourse[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [editingCourse, setEditingCourse] = useState<BuyerCourse | null>(null);
  const [form, setForm] = useState(emptyCourse);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [bankForm, setBankForm] = useState({ bankName: "", accountHolderName: "", accountNumber: "" });
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMessage, setBankMessage] = useState("");
  const [creator, setCreator] = useState({ name: "", photo: null as string | null, bio: "" });
  const [savedCreator, setSavedCreator] = useState("");
  const creatorDirty = JSON.stringify({ photo: creator.photo, bio: creator.bio }) !== savedCreator;
  const [creatorSaving, setCreatorSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [creatorMessage, setCreatorMessage] = useState("");
  const [savedBank, setSavedBank] = useState("");
  const hasBankDetails = !!(bankForm.bankName && bankForm.accountHolderName && bankForm.accountNumber);
  const bankDirty = JSON.stringify(bankForm) !== savedBank;
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  // Cover and lesson images upload as soon as they're picked; submitting
  // before they finish would save the course without them.
  const [uploadingCount, setUploadingCount] = useState(0);
  const trackUpload = (uploading: boolean) => setUploadingCount((n) => Math.max(0, n + (uploading ? 1 : -1)));

  async function loadData() {
    setLoading(true);
    try {
      const [coursesRes, mineRes, subsRes, profile] = await Promise.all([
        getBuyerBrowseCourses(),
        getMyCreatedCourses(),
        getMySubscriptions({ source: "buyer" }),
        getCurrentProfile(),
      ]);
      if (coursesRes.payload?.ok) setCourses(coursesRes.payload.courses ?? []);
      if (mineRes.payload?.ok) setMyCourses(mineRes.payload.courses ?? []);
      if (subsRes.payload?.ok) setSubscriptions(subsRes.payload.subscriptions ?? []);
      if (profile) {
        const bank = {
          bankName: (profile as any).bank_name || "",
          accountHolderName: (profile as any).account_holder_name || "",
          accountNumber: (profile as any).account_number || "",
        };
        setBankForm(bank);
        setSavedBank(JSON.stringify(bank));
        const photo = profile.profile_image || null;
        const bio = profile.bio || "";
        setCreator({ name: profile.name || "", photo, bio });
        setSavedCreator(JSON.stringify({ photo, bio }));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
  }, []);

  async function pickCreatorPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCreatorMessage("");
    setPhotoUploading(true);
    try {
      const photo = await uploadCourseCover(file);
      setCreator((c) => ({ ...c, photo }));
    } catch (err) {
      setCreatorMessage(err instanceof Error ? err.message : "Could not upload the photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function saveCreator(quiet = false) {
    setCreatorMessage("");
    setCreatorSaving(true);
    try {
      const { res, payload } = await saveCreatorProfile({ photo: creator.photo, bio: creator.bio });
      if (res.ok) {
        setSavedCreator(JSON.stringify({ photo: creator.photo, bio: creator.bio.trim() }));
        setCreator((c) => ({ ...c, bio: c.bio.trim() }));
        if (!quiet) toast.success("Instructor profile saved", { description: "Buyers will see it on all your courses." });
      } else {
        setCreatorMessage(payload?.error || "Could not save your profile.");
      }
    } catch {
      setCreatorMessage("Could not save your profile. Check your internet connection and try again.");
    } finally {
      setCreatorSaving(false);
    }
  }

  async function saveBankDetails() {
    setBankMessage("");
    if (bankForm.accountNumber.length < 10 || bankForm.accountNumber.length > 12) {
      setBankMessage("Account number must be 10-12 digits.");
      return;
    }

    setBankSaving(true);
    try {
      const { res, payload } = await saveCreatorBankDetails(bankForm);
      if (res.ok) setSavedBank(JSON.stringify(bankForm));
      setBankMessage(res.ok ? "Bank details saved." : payload?.error || "Could not save bank details.");
    } catch {
      setBankMessage("Could not save bank details. Check your internet connection and try again.");
    } finally {
      setBankSaving(false);
    }
  }

  const subscribedIds = useMemo(
    () => new Set(subscriptions.map((sub) => sub.course?._id).filter(Boolean)),
    [subscriptions],
  );

  const visibleCourses = courses.filter((course) => {
    const q = search.toLowerCase();
    return !subscribedIds.has(course._id) && (
      course.title.toLowerCase().includes(q) ||
      course.description.toLowerCase().includes(q)
    );
  });

  async function startEdit(course: BuyerCourse) {
    setEditingCourse(course);
    setMessage("");
    setFormError("");
    // course.content isn't in the list payload anymore (gated behind
    // getCourseContent's authorization check) -- fetched here instead,
    // authorized since this buyer is the course's own creator.
    const [{ res, payload }, contact] = await Promise.all([
      getCourseContent(course._id),
      getCourseCreatorContact(course._id),
    ]);
    setForm({
      title: course.title,
      description: course.description,
      price: String(course.price),
      content: (res.ok ? payload.content : undefined) || emptyCourse.content,
      coverImage: course.coverImage ?? null,
      whatsapp: (contact.res.ok ? contact.payload.whatsapp : null) || "",
    });
    setActiveTab("create");
  }

  async function submitCourse(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (uploadingCount > 0 || photoUploading) {
      toast.info("Please wait for the image to finish uploading", { duration: 5000 });
      return;
    }

    const failed = (reason: string) => {
      setFormError(reason);
      toast.error(editingCourse ? "Changes not saved" : "Course was not created", {
        description: `${reason} Your form has been kept, so you don't need to fill it again.`,
        duration: 12000,
      });
    };
    setMessage("");
    setFormError("");

    const title = form.title.trim();
    const description = form.description.trim();
    const price = Number(form.price);
    const whatsapp = form.whatsapp.trim();
    const contentText = form.content.replace(/<[^>]*>/g, "").trim();
    const hasMedia = /<(img|iframe|video)\b/i.test(form.content);
    let problem = "";
    if (!title) problem = "Add a course title.";
    else if (!description) problem = "Add a short course description.";
    else if (form.price === "" || !Number.isFinite(price) || price < 0) problem = "Enter a valid price (0 or more).";
    else if (whatsapp && !isValidWhatsapp(whatsapp)) problem = "Enter a valid WhatsApp number, e.g. +234 801 234 5678, or leave it empty.";
    else if ((!contentText && !hasMedia) || form.content === emptyCourse.content) {
      problem = "Add your course content (lessons, images or videos) in the editor.";
    }
    if (problem) {
      setFormError(problem);
      toast.error("Please complete the form", { description: problem, duration: 8000 });
      return;
    }

    setSubmitting(true);
    try {
      // Bank details typed in but never saved would otherwise be lost when
      // the page reloads its data below -- save them along with the course.
      if (hasBankDetails && bankDirty) {
        await saveBankDetails();
      }
      if (creatorDirty) {
        await saveCreator(true);
      }

      const body = { title, description, price, content: form.content, coverImage: form.coverImage, whatsapp };
      const { res, payload } = editingCourse
        ? await updateBuyerCourse(editingCourse._id, body)
        : await createBuyerCourse(body);

      if (!res.ok) {
        failed(friendlyCourseError(payload?.error));
        return;
      }

      const created = !editingCourse;
      toast.success(created ? "Course created successfully" : "Changes saved", {
        description: `"${title}" has been sent to the KizFarm admin team for verification. It will be visible to buyers and farmers once approved, and you'll get a notification when it's reviewed.`,
        duration: 10000,
      });
      setMessage(
        created
          ? `"${title}" was created and is waiting for admin verification. It goes live once an admin approves it.`
          : `Your changes to "${title}" were saved and sent back for admin verification.`,
      );
      setEditingCourse(null);
      setForm(emptyCourse);
      setActiveTab("mine");
      window.scrollTo({ top: 0, behavior: "smooth" });
      // The course is saved at this point; a failed refresh must not be
      // reported as "Course was not created".
      void loadData().catch(() => undefined);
    } catch (err) {
      failed(friendlyCourseError(err instanceof Error ? err.message : undefined));
    } finally {
      setSubmitting(false);
    }
  }

  const statusClass = (status?: ReviewStatus) => {
    if (status === "approved") return "bg-green-50 text-green-800";
    if (status === "rejected") return "bg-red-50 text-red-700";
    if (status === "pending") return "bg-amber-50 text-amber-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] pb-20 text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <div>
            <h1 className="text-xl font-bold text-green-900">Courses</h1>
            <p className="text-xs text-slate-500">Community-created training, reviewed by KizFarm</p>
          </div>
          {/* Only opens the form -- hidden on the form itself, where people
              clicked it expecting it to submit and "nothing happened". */}
          {activeTab !== "create" && (
            <button onClick={() => { setFormError(""); setActiveTab("create"); }} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">
              Create Course
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <section className="overflow-hidden rounded-lg bg-green-900 text-white">
          <div className="grid gap-5 p-6 md:grid-cols-[1fr_340px]">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-200">Community Learning Market</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-bold">Publish practical courses and buy approved community courses.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-green-50">Courses you create are reviewed by admins before they appear for buyers and farmers.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-white/10 p-4 text-center">
              <div>
                <p className="text-2xl font-bold">{loading ? "-" : courses.length}</p>
                <p className="text-xs text-green-100">Published</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? "-" : myCourses.length}</p>
                <p className="text-xs text-green-100">Created</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? "-" : subscriptions.length}</p>
                <p className="text-xs text-green-100">Bought</p>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div role="status" className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            <span className="material-symbols-outlined text-[20px] text-green-700">verified</span>
            <p className="flex-1 font-semibold">{message}</p>
            <button type="button" onClick={() => setMessage("")} className="text-green-700 hover:text-green-900" aria-label="Dismiss">✕</button>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["browse", "mine", "create"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  if (tab !== "create") setEditingCourse(null);
                  setActiveTab(tab);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-bold capitalize ${activeTab === tab ? "bg-green-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {tab === "mine" ? "My Courses" : tab}
              </button>
            ))}
          </div>
          {activeTab === "browse" && (
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm md:w-80" placeholder="Search community courses" />
          )}
        </div>

        {activeTab === "browse" && (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleCourses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-slate-500 md:col-span-2 xl:col-span-3">No new community courses to browse.</div>
            ) : (
              visibleCourses.map((course) => (
                <article key={course._id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div
                    className={`h-32 bg-cover bg-center p-5 text-white ${course.coverImage ? "" : "bg-gradient-to-br from-green-900 to-cyan-800"}`}
                    style={course.coverImage ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.15)), url(${course.coverImage})` } : undefined}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest opacity-80">Community Course</p>
                    <h3 className="mt-3 line-clamp-2 text-xl font-bold">{course.title}</h3>
                  </div>
                  <div className="space-y-4 p-5">
                    <p className="line-clamp-3 text-sm leading-6 text-slate-600">{course.description}</p>
                    {course.creatorProfile && (
                      <div className="flex items-center gap-3">
                        <CreatorAvatar creator={course.creatorProfile} size={36} />
                        <div className="min-w-0 text-sm">
                          <p className="truncate font-semibold text-slate-800">By {course.creatorProfile.name}</p>
                          {course.creatorProfile.verifiedFarmer && <p className="text-xs font-semibold text-green-700">Verified farmer</p>}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-green-800">NGN {(course.finalPrice ?? course.price).toLocaleString()}</span>
                      <Link href={`/learning/course?courseId=${course._id}${subscribedIds.has(course._id) ? "&access=1" : ""}&source=buyer&returnTo=${encodeURIComponent(returnTo)}`} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">
                        {subscribedIds.has(course._id) ? "Open" : "Details"}
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {activeTab === "mine" && (
          <section className="space-y-6">
            <div>
              <h2 className="mb-3 font-bold text-slate-900">Bought Courses</h2>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {subscriptions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-slate-500 lg:col-span-2">No bought courses yet.</div>
                ) : (
                  subscriptions.map((sub) => (
                    <article key={sub._id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-widest text-green-800">Unlocked Course</p>
                      <h3 className="mt-2 text-lg font-bold">{sub.course.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{sub.course.description}</p>
                      <div className="mt-5 flex items-center justify-between">
                        <span className="font-bold text-green-800">NGN {(sub.course.finalPrice ?? sub.course.price).toLocaleString()}</span>
                        <Link href={`/learning/course?courseId=${sub.course._id}&access=1&source=buyer&returnTo=${encodeURIComponent(returnTo)}`} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">
                          Continue
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div>
              <h2 className="mb-3 font-bold text-slate-900">Created Courses</h2>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {myCourses.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-slate-500 lg:col-span-2">You have not created any courses yet.</div>
                ) : (
                  myCourses.map((course) => (
                    <article key={course._id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        {course.coverImage && (
                          <img src={course.coverImage} alt="" className="h-16 w-24 shrink-0 rounded-md object-cover" />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-bold">{course.title}</h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{course.description}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClass(course.status)}`}>{course.status ?? "draft"}</span>
                      </div>
                      {course.rejectionReason && (
                        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{course.rejectionReason}</div>
                      )}
                      <div className="mt-5 flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-bold text-green-800">NGN {course.price.toLocaleString()}</span>
                          {course.finalPrice && course.finalPrice !== course.price && <span className="ml-2 text-slate-500">Published: NGN {course.finalPrice.toLocaleString()}</span>}
                        </div>
                        <button onClick={() => startEdit(course)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-green-800 hover:bg-green-50">
                          {course.status === "rejected" ? "Edit & Resubmit" : "Edit"}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "create" && (
          <div className="space-y-5">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Your Instructor Profile</h2>
              <p className="mt-1 text-sm text-slate-500">
                Shown on every course you publish, so buyers know who is teaching them. Your email, phone and bank details are never shown.
              </p>
              <div className="mt-4 flex flex-col gap-5 md:flex-row">
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <div className="relative">
                    <CreatorAvatar creator={{ name: creator.name || "You", photo: creator.photo || undefined }} size={96} />
                    {photoUploading && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </span>
                    )}
                  </div>
                  <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-gray-50">
                    {creator.photo ? "Change photo" : "Add photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={pickCreatorPhoto} disabled={photoUploading} />
                  </label>
                  {creator.photo && (
                    <button type="button" onClick={() => setCreator((c) => ({ ...c, photo: null }))} className="text-xs font-semibold text-red-600 hover:underline">
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{creator.name || "Your name"}</p>
                  <textarea
                    value={creator.bio}
                    onChange={(e) => setCreator((c) => ({ ...c, bio: e.target.value.slice(0, 600) }))}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
                    placeholder="About you: your farming experience, what you grow or raise, and why you can help others. E.g. 'I have raised catfish in Enugu for 6 years and supply restaurants weekly.'"
                  />
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{creator.bio.length}/600</span>
                    {creatorMessage && <span className="text-red-600">{creatorMessage}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => saveCreator()}
                    disabled={creatorSaving || photoUploading || !creatorDirty}
                    className="mt-2 rounded-lg border border-green-800 px-4 py-2 text-sm font-bold text-green-800 hover:bg-green-50 disabled:opacity-50"
                  >
                    {creatorSaving ? "Saving..." : creatorDirty ? "Save Profile" : "Profile Saved"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Payout Bank Details</h2>
              <p className="mt-1 text-sm text-slate-500">
                Where we send your earnings when an admin releases a payout after someone subscribes to your course.
              </p>
              {!hasBankDetails && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Add your bank details before submitting a course, so we can pay you once it earns.
                </p>
              )}
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="rounded-lg border border-gray-300 px-4 py-2"
                  placeholder="Bank name (e.g. Opay)"
                />
                <input
                  value={bankForm.accountHolderName}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                  className="rounded-lg border border-gray-300 px-4 py-2"
                  placeholder="Account holder name"
                />
                <input
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: onlyDigits(e.target.value).slice(0, 12) })}
                  className="rounded-lg border border-gray-300 px-4 py-2"
                  placeholder="Account number (10-12 digits)"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  minLength={10}
                  maxLength={12}
                />
              </div>
              {bankMessage && <p className="mt-2 text-sm text-slate-600">{bankMessage}</p>}
              <button
                type="button"
                onClick={saveBankDetails}
                disabled={bankSaving}
                className="mt-3 rounded-lg border border-green-800 px-4 py-2 text-sm font-bold text-green-800 hover:bg-green-50 disabled:opacity-60"
              >
                {bankSaving ? "Saving..." : "Save Bank Details"}
              </button>
            </div>

          <form onSubmit={submitCourse} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold">{editingCourse ? "Edit Course" : "Create Course"}</h2>
              <p className="mt-1 text-sm text-slate-500">Submitted courses stay pending until an admin approves them.</p>
            </div>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="Course title" />
            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="Course description" rows={3} />
            <input required min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 md:w-72" placeholder="Base price" type="number" />
            <div>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20) })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 md:w-72"
                placeholder="WhatsApp number (optional), e.g. +234 801 234 5678"
                inputMode="tel"
              />
              <p className="mt-1 text-xs text-slate-500">
                Subscribers can message you on WhatsApp for guidance during the first 30 days after they buy the course. It is never shown publicly.
              </p>
            </div>
            <CourseCoverInput value={form.coverImage} onChange={(coverImage) => setForm((f) => ({ ...f, coverImage }))} onUploadingChange={trackUpload} />
            <LearningRichEditor value={form.content} onChange={(content) => setForm((f) => ({ ...f, content }))} onUploadingChange={trackUpload} />
            {formError && (
              <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {formError}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting || uploadingCount > 0}
                className="inline-flex items-center gap-2 rounded-lg bg-green-800 px-5 py-3 font-bold text-white hover:bg-green-900 disabled:cursor-wait disabled:opacity-70"
              >
                {submitting && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {submitting
                  ? editingCourse ? "Saving..." : "Creating course..."
                  : uploadingCount > 0 ? "Uploading image..." : editingCourse ? "Save Changes" : "Create Course"}
              </button>
              {editingCourse && (
                <button type="button" disabled={submitting} onClick={() => { setEditingCourse(null); setForm(emptyCourse); setFormError(""); setActiveTab("mine"); }} className="rounded-lg border border-gray-200 px-5 py-3 font-bold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              )}
              <p className="text-xs text-slate-500">An admin reviews every course before it goes live.</p>
            </div>
          </form>
          </div>
        )}
      </main>
    </div>
  );
}
