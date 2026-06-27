"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/kizfarm/api";
import LearningRichEditor from "./learning-rich-editor";

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
  content: string;
  tutor?: Tutor;
  status?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  creator?: {
    _id: string;
    name?: string;
    email?: string;
  };
}

interface CoursePurchase {
  _id: string;
  course: Course;
  buyer?: {
    name?: string;
    email?: string;
  };
  amount: number;
  creatorAmount?: number;
  commission?: number;
  paymentReference?: string;
  paidAt?: string;
  payoutStatus?: "pending" | "released";
  releasedAt?: string;
}

export default function LearningHubAdminPage() {
  const [activeTab, setActiveTab] = useState<"courses" | "buyerCourses" | "purchases" | "tutors">("courses");
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [buyerCourses, setBuyerCourses] = useState<Course[]>([]);
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState<"approved" | "rejected" | "">("");
  const [releasingPayoutId, setReleasingPayoutId] = useState("");
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
  });

  async function loadData() {
    setLoading(true);
    try {
      const [tutorRes, courseRes] = await Promise.all([
        apiFetch("/learning/tutors"),
        apiFetch("/learning/courses?source=admin"),
      ]);
      if (tutorRes.payload?.ok) setTutors(tutorRes.payload.tutors ?? []);
      if (courseRes.payload?.ok) setCourses(courseRes.payload.courses ?? []);
      const [buyerCourseRes, purchasesRes] = await Promise.all([
        apiFetch("/learning/admin/buyer-courses"),
        apiFetch("/learning/admin/course-purchases"),
      ]);
      if (buyerCourseRes.payload?.ok) setBuyerCourses(buyerCourseRes.payload.courses ?? []);
      if (purchasesRes.payload?.ok) setPurchases(purchasesRes.payload.purchases ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Total Courses", value: courses.length, icon: "school" },
      { label: "Buyer Reviews", value: buyerCourses.filter((c) => c.status === "pending").length, icon: "rate_review" },
      { label: "Pending Payouts", value: purchases.filter((p) => p.payoutStatus !== "released").length, icon: "payments" },
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

    const body = new FormData();
    body.set("name", tutorForm.name);
    body.set("description", tutorForm.description);
    body.set("phone", tutorForm.phone);
    body.set("whatsapp", tutorForm.whatsapp);
    body.set("image", tutorForm.image);

    const { res, payload } = await apiFetch("/learning/tutors", {
      method: "POST",
      body,
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
    const { res, payload } = await apiFetch("/learning/courses", {
      method: "POST",
      body: JSON.stringify({
        title: courseForm.title,
        description: courseForm.description,
        price: Number(courseForm.price),
        tutor: courseForm.tutor,
        content: courseForm.content,
      }),
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
      const { res, payload } = await apiFetch(`/learning/admin/buyer-courses/${course._id}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          commission,
          rejectionReason: reviewForm.rejectionReason.trim() || "Rejected by admin. Please update the course and resubmit.",
        }),
      });
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
    if (purchase.payoutStatus === "released" || releasingPayoutId) return;
    setMessage("");
    setReleasingPayoutId(purchase._id);
    try {
      const { res, payload } = await apiFetch(`/learning/admin/course-purchases/${purchase._id}/release-payout`, {
        method: "POST",
        body: JSON.stringify({}),
      });
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
      setMessage("Course creator payout released.");
      await loadData();
    } finally {
      setReleasingPayoutId("");
    }
  }

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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="material-symbols-outlined text-green-800">{item.icon}</span>
              <p className="mt-4 text-sm font-semibold text-slate-500">{item.label}</p>
              <p className="text-3xl font-bold">{loading ? "-" : item.value}</p>
            </div>
          ))}
        </div>

        {message && <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">{message}</div>}

        <div className="flex gap-2 rounded-xl bg-white p-2 shadow-sm">
          {(["courses", "buyerCourses", "purchases", "tutors"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-bold capitalize ${activeTab === tab ? "bg-green-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {tab === "buyerCourses" ? "Buyer Courses" : tab}
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
                          <div
                            className="prose max-w-none p-5 prose-headings:text-green-950 prose-a:text-green-800 [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:border-0 [&_img]:max-h-[520px] [&_img]:w-full [&_img]:rounded-lg [&_img]:object-contain"
                            dangerouslySetInnerHTML={{ __html: course.content }}
                          />
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
                      <button type="button" onClick={() => { setReviewingId(course._id); setReviewForm({ commission: String(course.commission ?? ""), rejectionReason: course.rejectionReason ?? "" }); }} className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-green-800 hover:bg-green-50">
                        Review Course
                      </button>
                    )}
                  </article>
                );
              })
            )}
          </section>
        ) : activeTab === "purchases" ? (
          <section className="space-y-3">
            {purchases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-slate-500">No course purchases yet.</div>
            ) : (
              purchases.map((purchase) => (
                <article key={purchase._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <h3 className="font-bold">{purchase.course?.title ?? "Course purchase"}</h3>
                      <p className="mt-1 text-sm text-slate-500">Buyer: {purchase.buyer?.name || purchase.buyer?.email || "Student"} · Ref: {purchase.paymentReference || "N/A"}</p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                        <span>Paid: NGN {purchase.amount.toLocaleString()}</span>
                        <span>Creator payout: NGN {(purchase.creatorAmount ?? purchase.course?.price ?? 0).toLocaleString()}</span>
                        <span>Commission: NGN {(purchase.commission ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${purchase.payoutStatus === "released" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-700"}`}>{purchase.payoutStatus ?? "pending"}</span>
                      {purchase.payoutStatus === "released" ? (
                        <span className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-800">
                          Funds released{purchase.releasedAt ? ` · ${new Date(purchase.releasedAt).toLocaleDateString()}` : ""}
                        </span>
                      ) : (
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
              ))
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
