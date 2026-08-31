"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { getCourses, getMySubscriptions } from "@/lib/kizfarm/supabase-data";
import { getCurrentProfile, redirectPathForRole } from "@/lib/kizfarm/supabase-auth";

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
  content: string;
  coverImage?: string;
  tutor?: Tutor;
}

interface Subscription {
  _id: string;
  course: Course;
  paidAt: string;
}

export default function LearningHubPage() {
  const [activeTab, setActiveTab] = useState<"browse" | "mine">("browse");
  const [courses, setCourses] = useState<Course[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dashboardHref, setDashboardHref] = useState("/buyer/dashboard");
  const [role, setRole] = useState<string | null>(null);

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
        setRole(profile.role);
        setDashboardHref(redirectPathForRole(profile.role));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
  }, []);

  const subscribedIds = useMemo(
    () => new Set(subscriptions.map((sub) => sub.course?._id)),
    [subscriptions],
  );
  const visibleCourses = courses.filter((course) => {
    const q = search.toLowerCase();
    return !subscribedIds.has(course._id) && (
      course.title.toLowerCase().includes(q) ||
      course.description.toLowerCase().includes(q) ||
      (course.tutor?.name ?? "").toLowerCase().includes(q)
    );
  });

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
              <p className="mt-4 text-sm text-green-100">My courses: {subscriptions.length}</p>
            </div>
          </div>
        </section>

        {role !== "farmer" && (
          <div className="flex items-center justify-between rounded-xl border border-green-100 bg-green-50 p-4">
            <div>
              <p className="text-sm font-bold text-green-900">Know something worth teaching?</p>
              <p className="text-sm text-green-800">Create your own course and sell it to other buyers, reviewed by an admin before it goes live.</p>
            </div>
            <Link href="/buyer/courses" className="whitespace-nowrap rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">
              Create a Course
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <button onClick={() => setActiveTab("browse")} className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab === "browse" ? "bg-green-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Browse Courses</button>
            <button onClick={() => setActiveTab("mine")} className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab === "mine" ? "bg-green-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}>My Courses</button>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm md:w-80" placeholder="Search courses or tutors" />
        </div>

        {activeTab === "browse" ? (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-slate-500 md:col-span-2 lg:col-span-3">
                No new courses to browse.
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
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-green-800">NGN {course.price.toLocaleString()}</span>
                    <Link href={`/learning/course?courseId=${course._id}`} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">
                      {subscribedIds.has(course._id) ? "Open" : "Details"}
                    </Link>
                  </div>
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
              subscriptions.map((sub) => (
                <article key={sub._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-green-800">Unlocked Course</p>
                  <h3 className="mt-2 text-xl font-bold">{sub.course.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{sub.course.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-slate-500">Coach: {sub.course.tutor?.name ?? "Assigned tutor"}</span>
                    <Link href={`/learning/course?courseId=${sub.course._id}&access=1`} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">Continue</Link>
                  </div>
                </article>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}
