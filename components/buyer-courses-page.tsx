"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { getBuyerBrowseCourses, getMyCreatedCourses, getMySubscriptions } from "@/lib/kizfarm/supabase-data";
import { getCurrentProfile } from "@/lib/kizfarm/supabase-auth";
import { createBuyerCourse, updateBuyerCourse, saveCreatorBankDetails } from "@/lib/kizfarm/supabase-mutations";
import LearningRichEditor from "./learning-rich-editor";

type ReviewStatus = "draft" | "pending" | "approved" | "rejected";

interface BuyerCourse {
  _id: string;
  title: string;
  description: string;
  price: number;
  finalPrice?: number;
  commission?: number;
  content: string;
  status?: ReviewStatus;
  rejectionReason?: string;
  createdAt?: string;
}

interface Subscription {
  _id: string;
  course: BuyerCourse;
  paidAt: string;
}

const emptyCourse = {
  title: "",
  description: "",
  price: "",
  content: "<h2>Course overview</h2><p>Add lessons, images, and YouTube videos here.</p>",
};

export default function BuyerCoursesPage() {
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
  const hasBankDetails = !!(bankForm.bankName && bankForm.accountHolderName && bankForm.accountNumber);

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
        setBankForm({
          bankName: (profile as any).bank_name || "",
          accountHolderName: (profile as any).account_holder_name || "",
          accountNumber: (profile as any).account_number || "",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
  }, []);

  async function saveBankDetails() {
    setBankSaving(true);
    setBankMessage("");
    try {
      const { res, payload } = await saveCreatorBankDetails(bankForm);
      setBankMessage(res.ok ? "Bank details saved." : payload?.error || "Could not save bank details.");
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

  function startEdit(course: BuyerCourse) {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description,
      price: String(course.price),
      content: course.content || emptyCourse.content,
    });
    setActiveTab("create");
    setMessage("");
  }

  async function submitCourse(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const body = {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      content: form.content,
    };
    const { res, payload } = editingCourse
      ? await updateBuyerCourse(editingCourse._id, body)
      : await createBuyerCourse(body);

    if (!res.ok) {
      setMessage(payload?.error || "Could not submit course.");
      return;
    }

    setMessage(editingCourse ? "Course updated and sent back for review." : "Course submitted for admin review.");
    setEditingCourse(null);
    setForm(emptyCourse);
    setActiveTab("mine");
    await loadData();
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
            <p className="text-xs text-slate-500">Buyer-created training, reviewed by KizFarm</p>
          </div>
          <button onClick={() => setActiveTab("create")} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">
            Create Course
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <section className="overflow-hidden rounded-lg bg-green-900 text-white">
          <div className="grid gap-5 p-6 md:grid-cols-[1fr_340px]">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-200">Buyer Learning Market</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-bold">Publish practical courses and buy approved buyer-led courses.</h2>
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

        {message && <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">{message}</div>}

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
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm md:w-80" placeholder="Search buyer courses" />
          )}
        </div>

        {activeTab === "browse" && (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleCourses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-slate-500 md:col-span-2 xl:col-span-3">No new buyer courses to browse.</div>
            ) : (
              visibleCourses.map((course) => (
                <article key={course._id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="h-32 bg-gradient-to-br from-green-900 to-cyan-800 p-5 text-white">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-80">Buyer Course</p>
                    <h3 className="mt-3 line-clamp-2 text-xl font-bold">{course.title}</h3>
                  </div>
                  <div className="space-y-4 p-5">
                    <p className="line-clamp-3 text-sm leading-6 text-slate-600">{course.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-green-800">NGN {(course.finalPrice ?? course.price).toLocaleString()}</span>
                      <Link href={`/learning/course?courseId=${course._id}${subscribedIds.has(course._id) ? "&access=1" : ""}&source=buyer&returnTo=/buyer/courses`} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">
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
                        <Link href={`/learning/course?courseId=${sub.course._id}&access=1&source=buyer&returnTo=/buyer/courses`} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">
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
                        <div>
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
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  className="rounded-lg border border-gray-300 px-4 py-2"
                  placeholder="Account number"
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
            <LearningRichEditor value={form.content} onChange={(content) => setForm({ ...form, content })} />
            <div className="flex flex-wrap gap-3">
              <button className="rounded-lg bg-green-800 px-5 py-3 font-bold text-white hover:bg-green-900">{editingCourse ? "Submit Changes" : "Submit for Review"}</button>
              {editingCourse && (
                <button type="button" onClick={() => { setEditingCourse(null); setForm(emptyCourse); setActiveTab("mine"); }} className="rounded-lg border border-gray-200 px-5 py-3 font-bold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              )}
            </div>
          </form>
          </div>
        )}
      </main>
    </div>
  );
}
