"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { sanitizeCourseHtml } from "@/lib/kizfarm/sanitize-course-html";
import type { CreatorProfile } from "@/lib/kizfarm/supabase-data";
import CourseCreatorCard, { CreatorAvatar } from "./course-creator-card";
import { getCourseAccess, getCourseById, getCourseContent, getCourseCreatorContact, getCourseReviews } from "@/lib/kizfarm/supabase-data";
import { submitCourseReview } from "@/lib/kizfarm/supabase-mutations";

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
  content?: string;
  coverImage?: string;
  source?: "admin" | "buyer";
  tutor?: Tutor;
  creator?: { _id: string; name: string };
  creatorProfile?: CreatorProfile;
  hasWhatsappGuidance?: boolean;
}

interface CreatorContact {
  whatsapp: string | null;
  accessUntil: string | null;
  expired: boolean;
}

// wa.me needs the number in international form with digits only. Nigerian
// numbers are often typed locally ("0801..."), so swap the leading 0 for 234.
function whatsappLink(number: string) {
  let digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `234${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

interface Review {
  _id: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function Stars({ rating, size = "text-[18px]" }: { rating: number; size?: string }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`material-symbols-outlined ${size} text-amber-500`}
          style={{ fontVariationSettings: i < Math.round(rating) ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      ))}
    </>
  );
}

export default function CourseDetailPage() {
  const params = useSearchParams();
  const courseId = params.get("courseId");
  const wantsAccess = params.get("access") === "1";
  const source = params.get("source") === "buyer" ? "buyer" : "admin";
  const returnTo = params.get("returnTo") || "/learning";
  const [course, setCourse] = useState<Course | null>(null);
  // Never trust wantsAccess (a client-controlled URL param) for this --
  // it must only flip true once getCourseAccess has actually confirmed an
  // active subscription server-side.
  const [hasAccess, setHasAccess] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [creatorContact, setCreatorContact] = useState<CreatorContact | null>(null);
  const [error, setError] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsAvg, setReviewsAvg] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    async function loadCourse() {
      if (!courseId) return;
      setError("");
      setHasAccess(false);
      setCreatorContact(null);

      // Base metadata (title, price, description, cover) is always safe to
      // show -- it's public preview info. The lesson content itself is
      // fetched separately below, only once access is actually confirmed.
      const base = await getCourseById(courseId, { source });
      if (!base.res.ok) {
        setError(base.payload?.error || "Could not load course.");
        return;
      }
      setCourse((base.payload.course as Course) ?? null);

      if (!wantsAccess) return;

      const access = await getCourseAccess(courseId, { source });
      if (!access.res.ok) return; // not subscribed -- hasAccess stays false

      const content = await getCourseContent(courseId);
      if (!content.res.ok) return;

      setCourse((prev) => (prev ? { ...prev, content: content.payload.content as string } : prev));
      setHasAccess(true);

      if (base.payload.course?.source === "buyer") {
        const contact = await getCourseCreatorContact(courseId);
        if (contact.res.ok && (contact.payload.whatsapp || contact.payload.expired)) {
          setCreatorContact({
            whatsapp: contact.payload.whatsapp,
            accessUntil: contact.payload.accessUntil,
            expired: contact.payload.expired,
          });
        }
      }
    }
    loadCourse();
  }, [courseId, source, wantsAccess]);

  useEffect(() => {
    async function loadReviews() {
      if (!courseId) return;
      const { res, payload } = await getCourseReviews(courseId);
      if (res.ok) {
        setReviews((payload.reviews as Review[]) || []);
        setReviewsAvg(payload.avg || 0);
      }
    }
    loadReviews();
  }, [courseId]);

  async function handleSubmitReview() {
    if (!courseId) return;
    setSubmittingReview(true);
    setReviewError("");
    try {
      const { res, payload } = await submitCourseReview(courseId, { rating: newRating, comment: newComment });
      if (!res.ok) {
        setReviewError(payload?.error || "Failed to submit review.");
        return;
      }
      setShowReviewForm(false);
      setNewComment("");
      const refreshed = await getCourseReviews(courseId);
      if (refreshed.res.ok) {
        setReviews((refreshed.payload.reviews as Review[]) || []);
        setReviewsAvg(refreshed.payload.avg || 0);
      }
    } finally {
      setSubmittingReview(false);
    }
  }

  if (!courseId) {
    return <div className="p-8 text-sm text-slate-600">Choose a course from the learning hub.</div>;
  }

  if (!course && !error) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-slate-600">
        <span className="material-symbols-outlined animate-spin">autorenew</span>
        Loading course...
      </div>
    );
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
            <div
              className="relative overflow-hidden rounded-xl bg-green-900 text-white shadow-sm bg-cover bg-center"
              style={course.coverImage ? { backgroundImage: `url(${course.coverImage})` } : undefined}
            >
              <div
                className={`min-h-72 p-8 ${
                  course.coverImage
                    ? "bg-gradient-to-t from-black/80 via-black/40 to-black/10 flex flex-col justify-end"
                    : "bg-gradient-to-br from-green-950 via-green-800 to-lime-700"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-green-200">Course Detail</p>
                <h1 className="mt-5 max-w-3xl text-4xl font-bold">{course.title}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-green-50">{course.description}</p>
                {course.creatorProfile && (
                  <div className="mt-5 flex items-center gap-3">
                    <CreatorAvatar creator={course.creatorProfile} size={40} />
                    <div className="text-sm">
                      <p className="font-bold text-white">By {course.creatorProfile.name}</p>
                      {(course.creatorProfile.farmName || course.creatorProfile.location) && (
                        <p className="text-green-100">{[course.creatorProfile.farmName, course.creatorProfile.location].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                  </div>
                )}
                {reviews.length > 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <Stars rating={reviewsAvg} />
                    <span className="text-sm font-semibold text-green-50">{reviewsAvg} ({reviews.length} review{reviews.length === 1 ? "" : "s"})</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              {hasAccess ? (
                <div className="prose max-w-none prose-headings:text-green-950 prose-a:text-green-800 [&_iframe]:my-6 [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-xl [&_img]:w-full [&_img]:rounded-xl [&_img]:shadow-sm" dangerouslySetInnerHTML={{ __html: sanitizeCourseHtml(course.content ?? "") }} />
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

            {/* Reviews */}
            <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Reviews</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <Stars rating={reviewsAvg} />
                    <span className="text-sm text-slate-500">{reviewsAvg > 0 ? `${reviewsAvg} / 5.0` : "No ratings yet"}</span>
                  </div>
                </div>
                {hasAccess && (
                  <button
                    onClick={() => setShowReviewForm((p) => !p)}
                    className="text-sm font-semibold text-green-800 hover:underline"
                  >
                    {showReviewForm ? "Cancel" : "Write a Review"}
                  </button>
                )}
              </div>

              {showReviewForm && (
                <div className="mt-4 rounded-lg border border-gray-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setNewRating(n)} type="button">
                        <span
                          className="material-symbols-outlined text-2xl text-amber-500"
                          style={{ fontVariationSettings: n <= newRating ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share what you thought of this course..."
                    rows={3}
                    className="mt-3 w-full rounded-lg border border-gray-200 p-3 text-sm"
                  />
                  {reviewError && <p className="mt-2 text-sm text-red-600">{reviewError}</p>}
                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="mt-3 rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900 disabled:opacity-60"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              )}

              <div className="mt-4 divide-y divide-gray-100">
                {reviews.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">No reviews yet.</p>
                ) : (
                  reviews.map((r) => (
                    <div key={r._id} className="py-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{r.buyerName}</span>
                        <div className="flex items-center">
                          <Stars rating={r.rating} size="text-[16px]" />
                        </div>
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
                    </div>
                  ))
                )}
              </div>
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
                <>
                {course.hasWhatsappGuidance && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    <span>Includes 30 days of WhatsApp guidance from {course.creator?.name || "the course creator"}.</span>
                  </div>
                )}
                <Link href={`/learning/checkout?courseId=${course._id}&source=${source}&returnTo=${encodeURIComponent(returnTo)}`} className="mt-5 block w-full rounded-lg bg-green-800 px-4 py-3 text-center font-bold text-white hover:bg-green-900">
                  Subscribe
                </Link>
                </>
              )}
            </div>

            {creatorContact && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">Guidance on WhatsApp</h2>
                {creatorContact.expired ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Your 30-day WhatsApp guidance period with {course.creator?.name || "the course creator"} ended on{" "}
                    {new Date(creatorContact.accessUntil!).toLocaleDateString()}. You still have full access to the course.
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Message {course.creator?.name || "the course creator"} for help while you put this course into practice on your farm.
                    </p>
                    <p className="mt-3 text-sm"><span className="font-bold">WhatsApp:</span> {creatorContact.whatsapp}</p>
                    <a
                      href={whatsappLink(creatorContact.whatsapp!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 font-bold text-white hover:bg-[#1ebe5a]"
                    >
                      <span className="material-symbols-outlined text-[20px]">chat</span>
                      Chat on WhatsApp
                    </a>
                    {creatorContact.accessUntil && (
                      <p className="mt-3 text-xs text-slate-500">
                        Available until {new Date(creatorContact.accessUntil).toLocaleDateString()} (30 days from your purchase).
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {!course.tutor && course.creatorProfile && <CourseCreatorCard creator={course.creatorProfile} />}

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
