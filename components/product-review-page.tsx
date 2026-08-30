"use client";

import React, { useState, useEffect } from "react";
import { getAdminReviews } from "@/lib/kizfarm/supabase-data";
import { deleteAdminReview } from "@/lib/kizfarm/supabase-mutations";

interface Review {
  _id: string;
  rating: number;
  comment: string;
  buyerName: string;
  createdAt: string;
  productId?: {
    _id: string;
    name: string;
    images: string[];
  };
  buyerId?: {
    _id: string;
    name: string;
    email: string;
  };
}

export default function ProductReviewPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { res, payload } = await getAdminReviews({ limit: 100 });
      if (res.ok) {
        setReviews(payload.reviews || []);
        setTotal(payload.total || 0);
      }
    } catch (err) {
      console.error("Fetch reviews failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (review: Review) => {
    const productName = review.productId?.name || "this product";
    if (
      !window.confirm(
        `Are you sure you want to remove this review for "${productName}"? This cannot be undone.`
      )
    )
      return;
    try {
      const { res, payload } = await deleteAdminReview(review._id);
      if (res.ok) {
        fetchReviews();
      } else {
        alert(payload?.error || "Failed to delete review");
      }
    } catch (err) {
      console.error("Delete review failed:", err);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`material-symbols-outlined text-[16px] ${
          i < rating ? "text-amber-500" : "text-slate-200"
        }`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        star
      </span>
    ));
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "—";

  const filteredReviews = reviews.filter((r) => {
    const matchesRating =
      ratingFilter === "all" || r.rating === Number(ratingFilter);
    if (!matchesRating) return false;
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      r.productId?.name?.toLowerCase().includes(q) ||
      (r.buyerId?.name || r.buyerName)?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="bg-background text-on-background antialiased"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <main className="min-h-screen">
        <div className="p-8 max-w-[1440px] mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-400 font-label-sm text-label-sm">
                <span>Admin</span>
                <span className="material-symbols-outlined text-xs">
                  chevron_right
                </span>
                <span className="text-emerald-800">Product Reviews</span>
              </div>
              <h2 className="font-h1 text-h1 text-on-background">
                Product Reviews
              </h2>
              <p className="text-sm text-slate-500">
                All customer reviews across the entire platform
              </p>
            </div>
            <button
              onClick={fetchReviews}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-label-md bg-white hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            <div className="bg-white p-lg rounded-xl border border-[#EAECF0] shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-label-sm">Total Reviews</span>
                <span
                  className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star_rate
                </span>
              </div>
              <span className="font-h2 text-slate-900">{total}</span>
            </div>
            <div className="bg-white p-lg rounded-xl border border-[#EAECF0] shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-label-sm">Avg Rating</span>
                <span
                  className="p-1.5 bg-amber-50 text-amber-700 rounded-lg material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="font-h2 text-slate-900">{avgRating}</span>
                <span className="text-amber-500 text-xs font-label-sm mb-1">/ 5</span>
              </div>
            </div>
            <div className="bg-white p-lg rounded-xl border border-[#EAECF0] shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-label-sm">5-Star Reviews</span>
                <span
                  className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  grade
                </span>
              </div>
              <span className="font-h2 text-slate-900">
                {reviews.filter((r) => r.rating === 5).length}
              </span>
            </div>
            <div className="bg-white p-lg rounded-xl border border-[#EAECF0] shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-label-sm">1-Star Reviews</span>
                <span
                  className="p-1.5 bg-red-50 text-red-700 rounded-lg material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  thumb_down
                </span>
              </div>
              <span className="font-h2 text-slate-900">
                {reviews.filter((r) => r.rating === 1).length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
            {/* Table Controls */}
            <div className="p-lg border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <h3 className="font-h3 text-h3 text-on-background">
                All Reviews{" "}
                <span className="ml-2 text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {filteredReviews.length}
                </span>
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    search
                  </span>
                  <input
                    className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none w-56"
                    placeholder="Search reviews..."
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                  />
                </div>
                <select
                  className="text-sm border border-slate-200 bg-white text-slate-700 rounded-lg py-1.5 pl-3 pr-6 focus:outline-none"
                  value={ratingFilter}
                  onChange={(e) =>
                    setRatingFilter(
                      e.target.value === "all" ? "all" : Number(e.target.value)
                    )
                  }
                >
                  <option value="all">All Ratings</option>
                  <option value={5}>⭐⭐⭐⭐⭐ 5 Stars</option>
                  <option value={4}>⭐⭐⭐⭐ 4 Stars</option>
                  <option value={3}>⭐⭐⭐ 3 Stars</option>
                  <option value={2}>⭐⭐ 2 Stars</option>
                  <option value={1}>⭐ 1 Star</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <span className="material-symbols-outlined animate-spin mr-2">
                    autorenew
                  </span>
                  Loading reviews...
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-3">
                    rate_review
                  </span>
                  <p className="text-sm font-medium">No reviews found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Reviews will appear here once buyers submit them
                  </p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-lg py-3 text-label-sm font-label-sm text-slate-400 uppercase tracking-widest">
                        Product
                      </th>
                      <th className="px-lg py-3 text-label-sm font-label-sm text-slate-400 uppercase tracking-widest">
                        Buyer
                      </th>
                      <th className="px-lg py-3 text-label-sm font-label-sm text-slate-400 uppercase tracking-widest">
                        Rating
                      </th>
                      <th className="px-lg py-3 text-label-sm font-label-sm text-slate-400 uppercase tracking-widest">
                        Comment
                      </th>
                      <th className="px-lg py-3 text-label-sm font-label-sm text-slate-400 uppercase tracking-widest text-right">
                        Date
                      </th>
                      <th className="px-lg py-3 text-label-sm font-label-sm text-slate-400 uppercase tracking-widest text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReviews.map((review) => (
                      <tr
                        key={review._id}
                        className="hover:bg-[#F9FAFB] transition-colors"
                      >
                        <td className="px-lg py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 flex-shrink-0">
                              {review.productId?.images?.[0] ? (
                                <img
                                  src={review.productId.images[0]}
                                  alt={review.productId.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="material-symbols-outlined text-slate-400 text-sm">
                                  inventory_2
                                </span>
                              )}
                            </div>
                            <p className="text-body-sm font-semibold text-slate-700 max-w-[160px] truncate">
                              {review.productId?.name || "Deleted Product"}
                            </p>
                          </div>
                        </td>
                        <td className="px-lg py-4">
                          <p className="text-body-sm font-semibold text-slate-700">
                            {review.buyerId?.name || review.buyerName || "Anonymous"}
                          </p>
                          {review.buyerId?.email && (
                            <p className="text-xs text-slate-400">
                              {review.buyerId.email}
                            </p>
                          )}
                        </td>
                        <td className="px-lg py-4">
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating)}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {review.rating}/5
                          </p>
                        </td>
                        <td className="px-lg py-4 max-w-[280px]">
                          <p className="text-body-sm text-slate-600 line-clamp-2">
                            {review.comment || (
                              <em className="text-slate-400">No comment</em>
                            )}
                          </p>
                        </td>
                        <td className="px-lg py-4 text-body-sm text-slate-400 text-right font-numeric whitespace-nowrap">
                          {new Date(review.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-lg py-4 text-right">
                          <button
                            onClick={() => handleDelete(review)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
