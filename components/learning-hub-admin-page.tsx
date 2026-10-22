"use client";

import React, { useEffect, useMemo, useState } from "react";
import { sanitizeCourseHtml } from "@/lib/kizfarm/sanitize-course-html";
import { getTutors, getCourses, getAdminBuyerCourses, getAdminCoursePurchases, getCourseContent, getCourseCreatorContact } from "@/lib/kizfarm/supabase-data";
import { createTutor, createAdminCourse, adminReviewBuyerCourse, releaseCoursePayout } from "@/lib/kizfarm/supabase-mutations";
import LearningRichEditor from "./learning-rich-editor";
import CourseCoverInput from "./course-cover-input";
import { AccessBadge, PayoutBadge } from "./course-access-meter";
import { courseAccessState, formatCourseDate } from "@/lib/kizfarm/course-access";

interface Tutor {
  _id: string;
  name: string;
  description: string;
  phone: string;
  whatsapp: string;
  imageUrl: string;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  finalPrice?: number;
  commission?: number;
  tutor?: Tutor;
  status?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  creator?: {
    _id: string;
    name?: string;
    email?: string;
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
  };
}

interface CoursePurchase {
  _id: string;
  course: Course;
  buyer?: {
    name?: string;
    email?: string;
  };
  source?: "admin" | "buyer";
  amount: number;
  creatorAmount?: number;
  commission?: number;
  paymentReference?: string;
  paidAt?: string;
  expiresAt?: string;
  payoutStatus?: "pending" | "released" | "not_applicable";
  releasedAt?: string;
}

type PurchaseFilter = "all" | "awaiting" | "released" | "active" | "expired";

const PURCHASE_FILTERS: { id: PurchaseFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "awaiting", label: "Awaiting payout" },
  { id: "released", label: "Payout released" },
  { id: "active", label: "Active access" },
  { id: "expired", label: "Expired" },
];

function naira(amount?: number | null) {
  return `NGN ${Number(amount || 0).toLocaleString()}`;
}

export default function LearningHubAdminPage() {
  const [activeTab, setActiveTab] = useState<"courses" | "buyerCourses" | "purchases" | "tutors">("courses");
  // Deep link from admin notifications: /learning/admin?tab=buyerCourses
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "courses" || tab === "buyerCourses" || tab === "purchases" || tab === "tutors") {
      void Promise.resolve().then(() => setActiveTab(tab));
    }
  }, []);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [buyerCourses, setBuyerCourses] = useState<Course[]>([]);
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  // course.content no longer comes back with the list (gated behind
  // getCourseContent's authorization check) -- fetched on demand per course
  // when its review panel is opened.
  const [reviewContent, setReviewContent] = useState<Record<string, string>>({});
  // Same on-demand pattern for the creator's WhatsApp (not in the list
  // payload either); null means the creator didn't give one.
  const [reviewWhatsapp, setReviewWhatsapp] = useState<Record<string, string | null>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<"approved" | "rejected" | "">("");
  const [releasingPayoutId, setReleasingPayoutId] = useState("");
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>("all");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [reviewForm, setReviewForm] = useState({ commission: "", rejectionReason: "" });

  const [tutorForm, setTutorForm] = useState({
    name: "",
    description: "",
    phone: "",
    whatsapp: "",
    image: null as File | null,
  });
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    price: "",
    tutor: "",
    content: "<h2>Course overview</h2><p>Add modules, images, and videos here.</p>",
    coverImage: null as string | null,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [tutorRes, courseRes] = await Promise.all([
        getTutors(),
        getCourses({ source: "admin" }),
      ]);
      if (tutorRes.payload?.ok) setTutors(tutorRes.payload.tutors ?? []);
      if (courseRes.payload?.ok) setCourses(courseRes.payload.courses ?? []);
      const [buyerCourseRes, purchasesRes] = await Promise.all([
        getAdminBuyerCourses(),
        getAdminCoursePurchases(),
      ]);
      if (buyerCourseRes.payload?.ok) setBuyerCourses(buyerCourseRes.payload.courses ?? []);
      if (purchasesRes.payload?.ok) setPurchases(purchasesRes.payload.purchases ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
  }, []);

  const stats = useMemo(
    () => [
      { label: "Total Courses", value: courses.length + buyerCourses.filter((c) => c.status === "approved").length, icon: "school" },
      { label: "Buyer Reviews", value: buyerCourses.filter((c) => c.status === "pending").length, icon: "rate_review" },
      { label: "Active Subscriptions", value: purchases.filter((p) => !courseAccessState(p.expiresAt).expired).length, icon: "group" },
      { label: "Pending Payouts", value: purchases.filter((p) => p.payoutStatus === "pending").length, icon: "payments" },
    ],
    [buyerCourses, courses, purchases],
  );

  async function submitTutor(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!tutorForm.image) {
      setMessage("Please choose a tutor image from your computer.");
      return;
    }

    const { res, payload } = await createTutor({
      name: tutorForm.name,
      description: tutorForm.description,
      phone: tutorForm.phone,
      whatsapp: tutorForm.whatsapp,
      imageFile: tutorForm.image,
    });
    if (!res.ok) {
      setMessage(payload?.error || "Could not save tutor.");
      return;
    }

    setTutorForm({ name: "", description: "", phone: "", whatsapp: "", image: null });
    setMessage("Tutor saved successfully.");
    await loadData();
  }

  async function submitCourse(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const { res, payload } = await createAdminCourse({
      title: courseForm.title,
      description: courseForm.description,
      price: Number(courseForm.price),
      tutorId: courseForm.tutor,
      content: courseForm.content,
      coverImage: courseForm.coverImage,
    });
    if (!res.ok) {
      setMessage(payload?.error || "Could not publish course.");
      return;
    }

    setCourseForm({
      title: "",
      description: "",
      price: "",
      tutor: tutors[0]?._id || "",
      content: "<h2>Course overview</h2><p>Add modules, images, and videos here.</p>",
      coverImage: null,
    });
    setMessage("Course published successfully.");
    await loadData();
  }

  async function reviewBuyerCourse(course: Course, status: "approved" | "rejected") {
    setMessage("");
    const commission = Number(reviewForm.commission || 0);
    if (status === "approved" && commission < 0) {
      setMessage("Commission cannot reduce the buyer's base course price.");
      return;
    }

    setReviewSubmitting(status);
    try {
      const { res, payload } = await adminReviewBuyerCourse(
        course._id,
        status === "approved",
        commission,
        reviewForm.rejectionReason.trim() || "Rejected by admin. Please update the course and resubmit.",
      );
      if (!res.ok) {
        setMessage(payload?.error || "Could not update buyer course review.");
        return;
      }
      setReviewingId("");
      setReviewForm({ commission: "", rejectionReason: "" });
      setMessage(status === "approved" ? "Buyer course approved and published." : "Buyer course rejected.");
      await loadData();
    } finally {
      setReviewSubmitting("");
    }
  }

  async function releasePayout(purchase: CoursePurchase) {
    if (purchase.payoutStatus !== "pending" || releasingPayoutId) return;
    setMessage("");
    setReleasingPayoutId(purchase._id);
    try {
      const { res, payload } = await releaseCoursePayout(purchase._id);
      if (!res.ok) {
        setMessage(payload?.error || "Could not release payout.");
        return;
      }
      setPurchases((current) =>
        current.map((item) =>
          item._id === purchase._id
            ? { ...item, payoutStatus: "released", releasedAt: new Date().toISOString() }
            : item,
        ),
      );
      setMessage("Payout released. The course creator has been notified by email.");
      await loadData();
    } finally {
      setReleasingPayoutId("");
    }
  }

  const purchaseSummary = useMemo(() => {
    const rows = new Map<string, {
      courseId: string; title: string; community: boolean; creatorName?: string;
      total: number; active: number; revenue: number; pendingAmount: number; pendingCount: number; releasedCount: number;
    }>();
    for (const p of purchases) {
      const id = p.course?._id ?? p._id;
      const row = rows.get(id) ?? {
        courseId: id,
        title: p.course?.title ?? "Course",
        community: p.source === "buyer",
        creatorName: p.course?.creator?.name,
        total: 0, active: 0, revenue: 0, pendingAmount: 0, pendingCount: 0, releasedCount: 0,
      };
      row.total += 1;
      if (!courseAccessState(p.expiresAt).expired) row.active += 1;
      row.revenue += Number(p.amount || 0);
      if (p.payoutStatus === "pending") {
        row.pendingCount += 1;
        row.pendingAmount += Number(p.creatorAmount ?? p.course?.price ?? 0);
      }
      if (p.payoutStatus === "released") row.releasedCount += 1;
      rows.set(id, row);
    }
    return [...rows.values()].sort((a, b) => b.pendingAmount - a.pendingAmount || b.total - a.total);
  }, [purchases]);

  const visiblePurchases = useMemo(() => {
    const q = purchaseSearch.trim().toLowerCase();
    return purchases.filter((p) => {
      const expired = courseAccessState(p.expiresAt).expired;
      if (purchaseFilter === "awaiting" && p.payoutStatus !== "pending") return false;
      if (purchaseFilter === "released" && p.payoutStatus !== "released") return false;
      if (purchaseFilter === "active" && expired) return false;
      if (purchaseFilter === "expired" && !expired) return false;
      if (!q) return true;
      return [p.course?.title, p.buyer?.name, p.buyer?.email, p.course?.creator?.name, p.course?.creator?.email, p.paymentReference]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [purchases, purchaseFilter, purchaseSearch]);

  const statusClass = (status?: Course["status"]) => {
    if (status === "approved") return "bg-green-50 text-green-800";
    if (status === "rejected") return "bg-red-50 text-red-700";
    return "bg-amber-50 text-amber-700";
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <div>
            <h1 className="text-xl font-bold text-green-900">Learning Management</h1>
            <p className="text-xs text-slate-500">Admin courses, buyer reviews, purchases, and tutors</p>
          </div>
          <button onClick={loadData} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-50">
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="material-symbols-outlined text-green-800">{item.icon}</span>
              <p className="mt-4 text-sm font-semibold text-slate-500">{item.label}</p>
              <p className="text-3xl font-bold">{loading ? "-" : item.value}</p>
            </div>
          ))}
        </div>

        {message && <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">{message}</div>}

        <div className="flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow-sm">
          {(["courses", "buyerCourses", "purchases", "tutors"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-bold capitalize ${activeTab === tab ? "bg-green-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {tab === "buyerCourses" ? "Buyer Courses" : tab === "purchases" ? "Subscriptions & Payouts" : tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            <span className="material-symbols-outlined animate-spin text-3xl text-green-800">autorenew</span>
            <p className="mt-3 text-sm font-semibold">Loading learning management data...</p>
          </div>
        ) : activeTab === "tutors" ? (
          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <form onSubmit={submitTutor} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Add New Tutor</h2>
              <input required value={tutorForm.name} onChange={(e) => setTutorForm({ ...tutorForm, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="Name" />
              <textarea required value={tutorForm.description} onChange={(e) => setTutorForm({ ...tutorForm, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="Description / Bio" rows={4} />
              <input required value={tutorForm.phone} onChange={(e) => setTutorForm({ ...tutorForm, phone: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="Phone Number" />
              <input required value={tutorForm.whatsapp} onChange={(e) => setTutorForm({ ...tutorForm, whatsapp: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="WhatsApp Number" />
              <label className="block rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm text-slate-600">
                <span className="font-semibold text-green-800">Upload tutor image</span>
                <input required type="file" accept="image/*" className="mt-3 block w-full text-sm" onChange={(e) => setTutorForm({ ...tutorForm, image: e.target.files?.[0] ?? null })} />
              </label>
              <button className="w-full rounded-lg bg-green-800 px-4 py-3 font-bold text-white hover:bg-green-900">Save Tutor</button>
            </form>

            <div className="grid gap-4 md:grid-cols-2">
              {tutors.map((tutor) => (
                <div key={tutor._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex gap-4">
                    <img src={tutor.imageUrl} alt={tutor.name} className="h-20 w-20 rounded-lg object-cover" />
                    <div>
                      <h3 className="font-bold">{tutor.name}</h3>
                      <p className="line-clamp-2 text-sm text-slate-500">{tutor.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <span>Phone: {tutor.phone}</span>
                    <span>WhatsApp: {tutor.whatsapp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "buyerCourses" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {buyerCourses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-slate-500 lg:col-span-2">No buyer course submissions yet.</div>
            ) : (
              buyerCourses.map((course) => {
                const isReviewing = reviewingId === course._id;
                const finalPrice = (course.finalPrice ?? course.price + (course.commission ?? 0));
                return (
                  <article key={course._id} className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${isReviewing ? "lg:col-span-2" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold">{course.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{course.description}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClass(course.status)}`}>{course.status ?? "pending"}</span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <span>Creator: {course.creator?.name || course.creator?.email || "Buyer"}</span>
                      <span>Base price: NGN {course.price.toLocaleString()}</span>
                      <span>Commission: NGN {(course.commission ?? 0).toLocaleString()}</span>
                      <span>Published price: NGN {finalPrice.toLocaleString()}</span>
                    </div>
                    {course.rejectionReason && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{course.rejectionReason}</div>}
                    {isReviewing ? (
                      <div className="mt-5 space-y-4">
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                          <div className="bg-green-900 p-6 text-white">
                            <p className="text-xs font-bold uppercase tracking-widest text-green-200">Course Preview</p>
                            <h4 className="mt-3 max-w-3xl text-2xl font-bold">{course.title}</h4>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-green-50">{course.description}</p>
                          </div>
                          {reviewContent[course._id] === undefined ? (
                            <div className="p-5 text-sm text-slate-500">Loading content…</div>
                          ) : (
                            <div
                              className="prose max-w-none p-5 prose-headings:text-green-950 prose-a:text-green-800 [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:border-0 [&_img]:max-h-[520px] [&_img]:w-full [&_img]:rounded-lg [&_img]:object-contain"
                              dangerouslySetInnerHTML={{ __html: sanitizeCourseHtml(reviewContent[course._id]) }}
                            />
                          )}
                        </div>
                        <div className="rounded-lg border border-gray-200 p-4 text-sm text-slate-700">
                          <span className="font-bold">Creator WhatsApp (shown to subscribers for 30 days): </span>
                          {reviewWhatsapp[course._id] === undefined
                            ? "Loading…"
                            : reviewWhatsapp[course._id] || "Not provided"}
                        </div>
                        <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                          <input min="0" type="number" value={reviewForm.commission} onChange={(e) => setReviewForm({ ...reviewForm, commission: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm" placeholder="Admin commission to add, e.g. 3000" />
                          <textarea value={reviewForm.rejectionReason} onChange={(e) => setReviewForm({ ...reviewForm, rejectionReason: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm" rows={3} placeholder="Rejection reason" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button disabled={!!reviewSubmitting} type="button" onClick={() => reviewBuyerCourse(course, "approved")} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900 disabled:opacity-60">{reviewSubmitting === "approved" ? "Approving..." : "Approve"}</button>
                          <button disabled={!!reviewSubmitting} type="button" onClick={() => reviewBuyerCourse(course, "rejected")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{reviewSubmitting === "rejected" ? "Rejecting..." : "Reject"}</button>
                          <button disabled={!!reviewSubmitting} type="button" onClick={() => setReviewingId("")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white disabled:opacity-60">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingId(course._id);
                          setReviewForm({ commission: String(course.commission ?? ""), rejectionReason: course.rejectionReason ?? "" });
                          if (reviewContent[course._id] === undefined) {
                            void getCourseContent(course._id).then(({ res, payload }) => {
                              if (res.ok) setReviewContent((prev) => ({ ...prev, [course._id]: payload.content as string }));
                            });
                          }
                          if (reviewWhatsapp[course._id] === undefined) {
                            void getCourseCreatorContact(course._id).then(({ res, payload }) => {
                              setReviewWhatsapp((prev) => ({ ...prev, [course._id]: res.ok ? payload.whatsapp ?? null : null }));
                            });
                          }
                        }}
                        className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-green-800 hover:bg-green-50"
                      >
                        Review Course
                      </button>
                    )}
                  </article>
                );
              })
            )}
          </section>
        ) : activeTab === "purchases" ? (
          <section className="space-y-5">
            {purchases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-slate-500">No course subscriptions yet.</div>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-5 py-4">
                    <h2 className="font-bold">Subscriptions by course</h2>
                    <p className="text-sm text-slate-500">Every course people have subscribed to, with payout progress for community courses.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Course</th>
                          <th className="px-5 py-3 font-semibold">Subscribers</th>
                          <th className="px-5 py-3 font-semibold">Revenue</th>
                          <th className="px-5 py-3 font-semibold">Awaiting payout</th>
                          <th className="px-5 py-3 font-semibold">Payouts released</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {purchaseSummary.map((row) => (
                          <tr key={row.courseId}>
                            <td className="px-5 py-3">
                              <p className="font-semibold">{row.title}</p>
                              <p className="text-xs text-slate-500">{row.community ? `Community · ${row.creatorName || "Unknown creator"}` : "KIZ FARM course"}</p>
                            </td>
                            <td className="px-5 py-3">{row.active} active · {row.total} total</td>
                            <td className="px-5 py-3">{naira(row.revenue)}</td>
                            <td className="px-5 py-3">{row.community ? <span className="font-semibold text-amber-700">{naira(row.pendingAmount)} ({row.pendingCount})</span> : "-"}</td>
                            <td className="px-5 py-3">{row.community ? `${row.releasedCount} of ${row.total}` : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {PURCHASE_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setPurchaseFilter(f.id)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-bold ${purchaseFilter === f.id ? "bg-green-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <input
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm md:w-72"
                    placeholder="Search course, subscriber, creator, ref"
                  />
                </div>

                {visiblePurchases.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-slate-500">No subscriptions match this filter.</div>
                ) : (
                  <div className="space-y-3">
                    {visiblePurchases.map((purchase) => {
                      const community = purchase.source === "buyer";
                      return (
                        <article key={purchase._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold">{purchase.course?.title ?? "Course subscription"}</h3>
                                <AccessBadge expiresAt={purchase.expiresAt} />
                              </div>
                              <p className="mt-1 text-sm text-slate-500">
                                Subscriber: {[purchase.buyer?.name, purchase.buyer?.email].filter(Boolean).join(" · ") || "Student"}
                              </p>
                              <p className="text-sm text-slate-500">
                                {community ? `Creator: ${[purchase.course?.creator?.name, purchase.course?.creator?.email].filter(Boolean).join(" · ") || "Unknown"}` : "KIZ FARM course"}
                              </p>
                              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                                <span>Paid: <strong>{naira(purchase.amount)}</strong></span>
                                {community && <span>Creator payout: <strong>{naira(purchase.creatorAmount ?? purchase.course?.price)}</strong></span>}
                                {community && <span>Commission: <strong>{naira(purchase.commission)}</strong></span>}
                                <span>Subscribed: {formatCourseDate(purchase.paidAt)} · Ends {formatCourseDate(purchase.expiresAt)}</span>
                              </div>
                              <p className="mt-1 text-xs text-slate-400">Ref: {purchase.paymentReference || "N/A"}</p>
                              {purchase.payoutStatus === "pending" && (
                                purchase.course?.creator?.bankName && purchase.course?.creator?.accountNumber ? (
                                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                    Pay to: <span className="font-bold">{purchase.course.creator.accountHolderName}</span> · {purchase.course.creator.bankName} · {purchase.course.creator.accountNumber}
                                  </div>
                                ) : (
                                  <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                                    Creator hasn&apos;t added bank details yet -- can&apos;t be paid out until they do.
                                  </div>
                                )
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                              <PayoutBadge status={purchase.payoutStatus} releasedAt={purchase.releasedAt} />
                              {purchase.payoutStatus === "pending" && (
                                <button
                                  type="button"
                                  onClick={() => releasePayout(purchase)}
                                  disabled={releasingPayoutId === purchase._id}
                                  className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {releasingPayoutId === purchase._id ? "Releasing..." : "Release Payout"}
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <form onSubmit={submitCourse} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Create Course</h2>
              <input required value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="Title" />
              <textarea required value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="Description" rows={3} />
              <div className="grid gap-4 md:grid-cols-2">
                <input required min="0" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="Price" type="number" />
                <select required value={courseForm.tutor} onChange={(e) => setCourseForm({ ...courseForm, tutor: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2">
                  <option value="">Assign Tutor</option>
                  {tutors.map((tutor) => <option key={tutor._id} value={tutor._id}>{tutor.name}</option>)}
                </select>
              </div>
              <CourseCoverInput value={courseForm.coverImage} onChange={(coverImage) => setCourseForm({ ...courseForm, coverImage })} />
              <LearningRichEditor value={courseForm.content} onChange={(content) => setCourseForm({ ...courseForm, content })} />
              <button className="rounded-lg bg-green-800 px-5 py-3 font-bold text-white hover:bg-green-900">Publish Course</button>
            </form>

            <aside className="space-y-3">
              <h2 className="font-bold">Published Courses</h2>
              {courses.map((course) => (
                <div key={course._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="font-bold">{course.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{course.description}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-bold text-green-800">NGN {course.price.toLocaleString()}</span>
                    <span>{course.tutor?.name ?? "No tutor"}</span>
                  </div>
                </div>
              ))}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
