"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { getCourses, getMySubscriptions } from "@/lib/kizfarm/supabase-data";
import { getCurrentProfile, redirectPathForRole } from "@/lib/kizfarm/supabase-auth";
import type { CreatorProfile } from "@/lib/kizfarm/supabase-data";
import { CreatorAvatar } from "./course-creator-card";
import { AccessBadge, AccessMeter } from "./course-access-meter";
import { courseAccessState } from "@/lib/kizfarm/course-access";

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
  source?: "admin" | "buyer";
  content?: string;
  coverImage?: string;
  tutor?: Tutor;
  creatorProfile?: CreatorProfile;
}

interface Subscription {
  _id: string;
  course: Course;
  paidAt: string;
  expiresAt: string;
}

export default function LearningHubPage() {
  const [activeTab, setActiveTab] = useState<"browse" | "mine">("browse");
  const [courses, setCourses] = useState<Course[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dashboardHref, setDashboardHref] = useState("/buyer/dashboard");

  async function loadData() {
    setLoading(true);
    try {
      const [coursesRes, subsRes, profile] = await Promise.all([
        getCourses({ audience: "farmer" }),
        getMySubscriptions(),
        getCurrentProfile(),
      ]);
      if (coursesRes.payload?.ok) setCourses(coursesRes.payload.courses ?? []);
      if (subsRes.payload?.ok) setSubscriptions(subsRes.payload.subscriptions ?? []);
      if (profile) {
        setDashboardHref(redirectPathForRole(profile.role));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
  }, []);

  const subscriptionByCourse = useMemo(
    () => new Map(subscriptions.filter((sub) => sub.course?._id).map((sub) => [sub.course._id, sub])),
    [subscriptions],
  );
  // Bought courses stay in the list (marked as subscribed) -- hiding them
  // made a purchase look like the course had disappeared.
  const visibleCourses = courses.filter((course) => {
    const q = search.toLowerCase();
    return (
      course.title.toLowerCase().includes(q) ||
      course.description.toLowerCase().includes(q) ||
      (course.tutor?.name ?? "").toLowerCase().includes(q)
    );
  });
  const courseHref = (course: Course, subscribed: boolean) =>
    `/learning/course?courseId=${course._id}${subscribed ? "&access=1" : ""}&source=${course.source === "buyer" ? "buyer" : "admin"}`;

  return (
    <div className="min-h-screen bg-[#f7faf7] pb-20 text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div>
            <h1 className="text-xl font-bold text-green-900">Learning Hub</h1>
            <p className="text-xs text-slate-500">Expert-led courses for modern farmers</p>
          </div>
          <Link href={dashboardHref} className="text-sm font-semibold text-green-800 hover:underline">Dashboard</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="overflow-hidden rounded-xl bg-green-900 text-white">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_320px] md:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-200">Courses and Learning</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-bold md:text-4xl">Build stronger harvests with practical coaching.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-green-50">Subscribe once, unlock the full lesson content, and contact the assigned coach when you need help applying it on your farm.</p>
            </div>
            <div className="rounded-lg bg-white/10 p-5">
              <p className="text-sm text-green-100">Available courses</p>
              <p className="text-4xl font-bold">{loading ? "-" : courses.length}</p>
              <p className="mt-4 text-sm text-green-100">
                My subscriptions: {subscriptions.filter((sub) => !courseAccessState(sub.expiresAt).expired).length} active
              </p>
            </div>
          </div>
        </section>

        {/* Shown to farmers and buyers alike. It used to be hidden for
            farmers, which made it flash on screen until the profile loaded. */}
        <div className="flex flex-col gap-3 rounded-xl border border-green-100 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-green-900">Know something worth teaching?</p>
            <p className="text-sm text-green-800">Create your own course and sell it to farmers and buyers. An admin reviews it before it goes live.</p>
          </div>
          <Link href="/learning/my-courses" className="whitespace-nowrap rounded-lg bg-green-800 px-4 py-2 text-center text-sm font-bold text-white hover:bg-green-900">
            Create a Course
          </Link>
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <button onClick={() => setActiveTab("browse")} className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab === "browse" ? "bg-green-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Browse Courses</button>
            <button onClick={() => setActiveTab("mine")} className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab === "mine" ? "bg-green-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}>My Subscriptions</button>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm md:w-80" placeholder="Search courses or tutors" />
        </div>

        {activeTab === "browse" ? (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-slate-500 md:col-span-2 lg:col-span-3">
                No courses match your search.
              </div>
            ) : visibleCourses.map((course) => (
              <article key={course._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div
                  className={`h-36 bg-cover bg-center p-5 text-white ${course.coverImage ? "" : "bg-gradient-to-br from-green-800 to-lime-700"}`}
                  style={
                    course.coverImage
                      ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.15)), url(${course.coverImage})` }
                      : undefined
                  }
                >
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Course</p>
                  <h3 className="mt-4 line-clamp-2 text-xl font-bold">{course.title}</h3>
                </div>
                <div className="space-y-4 p-5">
                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">{course.description}</p>
                  {course.tutor && (
                    <div className="flex items-center gap-3">
                      <img src={course.tutor.imageUrl} alt={course.tutor.name} className="h-10 w-10 rounded-full object-cover" />
                      <span className="text-sm font-semibold">{course.tutor.name}</span>
                    </div>
                  )}
                  {!course.tutor && course.creatorProfile && (
                    <div className="flex items-center gap-3">
                      <CreatorAvatar creator={course.creatorProfile} size={40} />
                      <span className="text-sm font-semibold">By {course.creatorProfile.name}</span>
                    </div>
                  )}
                  {(() => {
                    const sub = subscriptionByCourse.get(course._id);
                    const expired = sub ? courseAccessState(sub.expiresAt).expired : false;
                    return (
                      <>
                        {sub && <AccessBadge expiresAt={sub.expiresAt} />}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-green-800">NGN {(course.finalPrice ?? course.price).toLocaleString()}</span>
                          <Link
                            href={courseHref(course, !!sub)}
                            className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${expired ? "bg-amber-600 hover:bg-amber-700" : "bg-green-800 hover:bg-green-900"}`}
                          >
                            {!sub ? "Details" : expired ? "Renew" : "Open course"}
                          </Link>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {subscriptions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-slate-500 md:col-span-2">
                No courses unlocked yet.
              </div>
            ) : (
              subscriptions.map((sub) => {
                const access = courseAccessState(sub.expiresAt);
                return (
                  <article key={sub._id} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div>
                      <AccessBadge expiresAt={sub.expiresAt} />
                      <h3 className="mt-2 text-xl font-bold">{sub.course.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {sub.course.tutor ? `Coach: ${sub.course.tutor.name}` : sub.course.creatorProfile ? `By ${sub.course.creatorProfile.name}` : null}
                      </p>
                    </div>
                    <AccessMeter paidAt={sub.paidAt} expiresAt={sub.expiresAt} />
                    <div className="flex flex-wrap justify-end gap-2">
                      {access.canRenew && (
                        <Link
                          href={`/learning/checkout?courseId=${sub.course._id}&source=${sub.course.source === "buyer" ? "buyer" : "admin"}`}
                          className={`rounded-lg px-4 py-2 text-sm font-bold ${access.expired ? "bg-amber-600 text-white hover:bg-amber-700" : "border border-amber-300 text-amber-800 hover:bg-amber-50"}`}
                        >
                          Renew
                        </Link>
                      )}
                      {!access.expired && (
                        <Link href={courseHref(sub.course, true)} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">Continue learning</Link>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}
      </main>
    </div>
  );
}
