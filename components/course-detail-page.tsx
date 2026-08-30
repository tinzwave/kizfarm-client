"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { getCourseAccess, getCourseById } from "@/lib/kizfarm/supabase-data";

interface Tutor {
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
  content: string;
  source?: "admin" | "buyer";
  tutor?: Tutor;
}

export default function CourseDetailPage() {
  const params = useSearchParams();
  const courseId = params.get("courseId");
  const wantsAccess = params.get("access") === "1";
  const source = params.get("source") === "buyer" ? "buyer" : "admin";
  const returnTo = params.get("returnTo") || "/learning";
  const [course, setCourse] = useState<Course | null>(null);
  const [hasAccess, setHasAccess] = useState(wantsAccess);
  const [showCoach, setShowCoach] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCourse() {
      if (!courseId) return;
      setError("");
      const { res, payload } = wantsAccess
        ? await getCourseAccess(courseId, { source })
        : await getCourseById(courseId, { source });
      if (!res.ok) {
        setError(payload?.error || "Could not load course.");
        if (wantsAccess) {
          const fallback = await getCourseById(courseId, { source });
          if (fallback.payload?.ok) setCourse(fallback.payload.course);
        }
        return;
      }
      setCourse((payload.course as Course) ?? null);
      if (wantsAccess) setHasAccess(true);
    }
    loadCourse();
  }, [courseId, source, wantsAccess]);

  if (!courseId) {
    return <div className="p-8 text-sm text-slate-600">Choose a course from the learning hub.</div>;
  }

  if (!course && !error) {
    return <div className="p-8 text-sm text-slate-600">Loading course...</div>;
  }

  if (!course) {
    return <div className="p-8 text-sm text-red-600">{error}</div>;
  }

  const payablePrice = course.finalPrice ?? course.price;
  const canContactCoach = hasAccess && source === "admin" && !!course.tutor;

  return (
    <div className="min-h-screen bg-[#f7faf7] pb-20 text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href={returnTo} className="text-sm font-semibold text-green-800 hover:underline">Back to Learning</Link>
          {canContactCoach && (
            <button onClick={() => setShowCoach(true)} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">
              Contact Coach
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-8">
            <div className="overflow-hidden rounded-xl bg-green-900 text-white shadow-sm">
              <div className="min-h-72 bg-gradient-to-br from-green-950 via-green-800 to-lime-700 p-8">
                <p className="text-xs font-bold uppercase tracking-widest text-green-200">Course Detail</p>
                <h1 className="mt-5 max-w-3xl text-4xl font-bold">{course.title}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-green-50">{course.description}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              {hasAccess ? (
                <div className="prose max-w-none prose-headings:text-green-950 prose-a:text-green-800" dangerouslySetInnerHTML={{ __html: course.content }} />
              ) : (
                <div>
                  <h2 className="text-xl font-bold">About this course</h2>
                  <p className="mt-3 leading-7 text-slate-600">{course.description}</p>
                  <div className="mt-5 rounded-lg bg-green-50 p-4 text-sm text-green-900">
                    Subscribe to unlock the formatted lesson content, embedded videos, and images.
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4 lg:col-span-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Course Price</p>
              <p className="mt-2 text-3xl font-bold text-green-800">NGN {payablePrice.toLocaleString()}</p>
              {hasAccess ? (
                canContactCoach ? (
                <button onClick={() => setShowCoach(true)} className="mt-5 w-full rounded-lg bg-green-800 px-4 py-3 font-bold text-white hover:bg-green-900">Contact Coach</button>
                ) : (
                  <div className="mt-5 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">Course unlocked</div>
                )
              ) : (
                <Link href={`/learning/checkout?courseId=${course._id}&source=${source}&returnTo=${encodeURIComponent(returnTo)}`} className="mt-5 block w-full rounded-lg bg-green-800 px-4 py-3 text-center font-bold text-white hover:bg-green-900">
                  Subscribe
                </Link>
              )}
            </div>

            {course.tutor && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <img src={course.tutor.imageUrl} alt={course.tutor.name} className="h-24 w-24 rounded-full object-cover" />
                <h2 className="mt-4 text-lg font-bold">Meet your Coach</h2>
                <p className="mt-1 font-semibold text-green-800">{course.tutor.name}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{course.tutor.description}</p>
              </div>
            )}
          </aside>
        </div>
      </main>

      {showCoach && course.tutor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{course.tutor.name}</h2>
                <p className="text-sm text-slate-500">Assigned course coach</p>
              </div>
              <button onClick={() => setShowCoach(false)} className="text-slate-500 hover:text-slate-900">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="mt-5 space-y-3 rounded-lg bg-green-50 p-4 text-sm">
              <p><span className="font-bold">Phone:</span> {course.tutor.phone}</p>
              <p><span className="font-bold">WhatsApp:</span> {course.tutor.whatsapp}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
