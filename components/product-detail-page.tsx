"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProductById, getProductReviews, getWishlist } from "@/lib/kizfarm/supabase-data";
import { startChat, submitReview, addToWishlist, removeFromWishlist } from "@/lib/kizfarm/supabase-mutations";
import { useCart } from "@/lib/kizfarm/cart-context";

type FarmerRef =
  | string
  | {
      _id?: string;
      id?: string;
      farmerId?: string;
      farmer_id?: string;
      userId?: string | { _id?: string; id?: string };
      user?: string | { _id?: string; id?: string };
      farmName?: string;
      name?: string;
      location?: string;
    };

interface Product {
  _id: string;
  id?: string;
  userId?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  unit: string;
  quantity: number;
  images: string[];
  farmerId?: FarmerRef | null;
  farmer?: FarmerRef;
  farmer_id?: string;
  seller?: FarmerRef;
  owner?: FarmerRef;
  createdAt: string;
}

interface Review {
  _id: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

type Props = {
  productId?: string;
};

export default function ProductDetailPage({ productId }: Props) {
  const router = useRouter();
  const { addItem, isInCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsAvg, setReviewsAvg] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setError("Product ID not provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const { res, payload } = await getProductById(productId);

        if (!res.ok) {
          setError(payload?.error || "Failed to fetch product");
          setProduct(null);
          return;
        }

        setProduct(payload?.product || null);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to load product details");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // Fetch reviews whenever productId changes
  useEffect(() => {
    if (!productId) return;
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const { res, payload } = await getProductReviews(productId);
        if (res.ok) {
          setReviews(payload?.reviews || []);
          setReviewsAvg(payload?.avg || 0);
        }
      } catch {
        // silently ignore
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [productId]);

  // Check whether this product is already in the buyer's wishlist
  useEffect(() => {
    if (!productId) return;
    const checkWishlist = async () => {
      const { res, payload } = await getWishlist();
      if (res.ok) {
        const items = (payload.items || []) as { product: { _id: string } }[];
        setInWishlist(items.some((item) => item.product._id === productId));
      }
    };
    checkWishlist();
  }, [productId]);

  const handleGoBack = () => {
    router.back();
  };

  const farmerRef = product?.farmerId || product?.farmer || product?.seller || product?.owner;
  const farmer = farmerRef && typeof farmerRef === "object" ? farmerRef : null;
  const farmerName = farmer?.farmName || farmer?.name || "Farmer";
  const farmerLocation = farmer?.location || "Unknown Location";
  const chatProductId = product?._id || product?.id || productId || "";

  const handleChatWithFarmer = async () => {
    if (!chatProductId) {
      alert("Unable to start chat for this product right now.");
      return;
    }
    try {
      setChatLoading(true);
      const { res, payload } = await startChat(chatProductId);
      if (!res.ok || !payload.chat) {
        alert(payload?.error || "Failed to start chat. Please try again.");
        return;
      }
      router.push(`/buyer/chat/${payload.chat._id}`);
    } catch (err) {
      console.error("Error starting chat:", err);
      alert("Failed to start chat. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    const farmerRef = product.farmerId || product.farmer || product.seller || product.owner;
    const farmerId = typeof farmerRef === 'string'
      ? farmerRef
      : farmerRef?._id || farmerRef?.id || '';

    addItem({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity,
      maxQuantity: product.quantity,
      unit: product.unit,
      image: product.images?.[0],
      farmerId,
      farmerName,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleToggleWishlist = async () => {
    if (!product || wishlistLoading) return;
    setWishlistLoading(true);
    try {
      if (inWishlist) {
        const { res } = await removeFromWishlist(product._id);
        if (res.ok) setInWishlist(false);
      } else {
        const { res } = await addToWishlist(product._id);
        if (res.ok) setInWishlist(true);
      }
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!productId) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const { res, payload } = await submitReview(productId, { rating: newRating, comment: newComment });
      if (!res.ok) {
        setReviewError(payload?.error || 'Failed to submit review');
        return;
      }
      // Refresh reviews
      const { res: r2, payload: p2 } = await getProductReviews(productId);
      if (r2.ok) {
        setReviews(p2?.reviews || []);
        setReviewsAvg(p2?.avg || 0);
      }
      setShowReviewForm(false);
      setNewComment('');
      setNewRating(5);
    } catch {
      setReviewError('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background text-on-background font-body-md min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-on-surface-variant">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-background text-on-background font-body-md min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-error mb-4 block">error_outline</span>
          <h2 className="font-headline-lg mb-2">Oops!</h2>
          <p className="text-on-surface-variant mb-6">{error || "Product not found"}</p>
          <button
            onClick={handleGoBack}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const mainImage = product.images && product.images.length > 0
    ? product.images[0]
    : "https://via.placeholder.com/600x400?text=No+Image";

  const thumbnailImages = product.images && product.images.length > 1
    ? product.images.slice(0, 4)
    : [mainImage];

  const alreadyInCart = isInCart(product._id);

  function renderStars(rating: number, size = "text-[18px]") {
    return Array.from({ length: 5 }).map((_, i) => (
      <span
        key={i}
        className={`material-symbols-outlined ${size} text-tertiary`}
        style={{ fontVariationSettings: i < Math.round(rating) ? "'FILL' 1" : "'FILL' 0" }}
      >
        star
      </span>
    ));
  }

  return (
    <div className="bg-background text-on-background font-body-md">
      {/* TopAppBar */}
      <nav className="bg-white dark:bg-slate-950 docked full-width top-0 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center px-6 h-16 w-full max-w-[1440px] mx-auto sticky z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoBack}
            className="md:hidden p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-[#1B6D24]">arrow_back</span>
          </button>
          <img alt="KIZ FARM Logo" className="h-10 w-auto object-contain" src="/logo.jpeg" />
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-6 mr-8">
            <a className="text-gray-500 dark:text-gray-400 font-['Inter'] antialiased text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors px-2 py-1 rounded" href="#">Home</a>
            <a className="text-[#1B6D24] font-semibold font-['Inter'] antialiased text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors px-2 py-1 rounded" href="#">Market</a>
            <a className="text-gray-500 dark:text-gray-400 font-['Inter'] antialiased text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors px-2 py-1 rounded" href="#">Orders</a>
          </div>
          <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors rounded-full relative">
            <span className="material-symbols-outlined text-[#1B6D24]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
            <img alt="User Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVloDG359znR0oD8OoAHr18zD6gy6q_Y5wYSg2bFmBlknJ5XA_vVBDDxzabbluZap__eEh7S4bIrN-ohYMLsQteToGku6Rrh_EjW4j8F-wyxPw4bQbHLWxUK6-u-hwqvc5WbnooEXY89GEVTwm5VtqJcB2JoEJiHf6YG9rQsb-zqX02o3Ix-g4dclsz3qBQ91YDEX2L6vbgt5JdSMo7IKvZZq7AWmOVR16N_YyfF9xe1l8rixZNCI6O12Hrla-Qog_v7pnfSnUqDc" />
          </div>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <main className="max-w-[1440px] mx-auto px-4 md:px-margin py-base md:py-md">
        {/* Breadcrumb (Hidden on Mobile) */}
        <nav className="hidden md:flex items-center gap-2 mb-md text-on-surface-variant font-label-xs">
          <a className="hover:text-primary cursor-pointer" onClick={handleGoBack}>Market</a>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <a className="hover:text-primary">{product.category || "General"}</a>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-surface">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Gallery Section */}
          <div className="lg:col-span-7 flex flex-col gap-xs md:gap-base">
            <div className="w-full aspect-[4/3] md:aspect-[16/10] rounded-xl overflow-hidden bg-surface-container-low group">
              <img
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                src={mainImage}
              />
            </div>
            <div className="grid grid-cols-4 gap-xs md:gap-base">
              {thumbnailImages.map((img, idx) => (
                <button key={idx} className="aspect-square rounded-lg overflow-hidden border-2 border-primary hover:opacity-80 transition-opacity">
                  <img
                    alt={`${product.name} - ${idx + 1}`}
                    className="w-full h-full object-cover"
                    src={img}
                  />
                </button>
              ))}
              {product.images && product.images.length > 4 && (
                <button className="aspect-square rounded-lg overflow-hidden bg-surface-container-highest relative group">
                  <img alt="More Images" className="w-full h-full object-cover opacity-40" src={product.images[4]} />
                  <div className="absolute inset-0 flex items-center justify-center font-headline-md text-primary">+{product.images.length - 4}</div>
                </button>
              )}
            </div>
          </div>

          {/* Product Info Section */}
          <div className="lg:col-span-5 flex flex-col gap-gutter">
            <div className="flex flex-col gap-base">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-green-100 text-primary-container font-label-xs rounded-full inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-primary-container rounded-full"></span>
                  Available Now
                </span>
                <div className="flex items-center gap-1 text-tertiary">
                  {renderStars(reviewsAvg)}
                  <span className="font-label-sm">
                    {reviewsAvg > 0 ? `${reviewsAvg} (${reviews.length})` : 'No reviews'}
                  </span>
                </div>
              </div>
              <h2 className="font-headline-lg text-on-surface">{product.name}</h2>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-xl text-primary">₦{product.price.toLocaleString()}</span>
              </div>
            </div>

            {/* Farmer Info Card */}
            <div className="p-md bg-white border border-gray-200 rounded-xl flex items-center gap-md">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-100 bg-gray-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-gray-500">account_circle</span>
              </div>
              <div className="flex-1">
                <h4 className="font-headline-md text-on-surface text-[18px]">{farmerName}</h4>
                <p className="text-on-surface-variant font-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  {farmerLocation}
                </p>
                <div className="flex gap-2 mt-xs">
                  <span className="text-[10px] bg-surface-container-highest px-2 py-0.5 rounded text-on-surface-variant font-semibold">VERIFIED SELLER</span>
                </div>
              </div>
              <button className="w-10 h-10 flex items-center justify-center rounded-full border border-outline-variant text-primary hover:bg-green-50 transition-colors">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-base">
              <h3 className="font-headline-md text-[20px]">Product Description</h3>
              <p className="text-on-surface-variant font-body-md leading-relaxed">
                {product.description || "No description available"}
              </p>
              {product.unit && (
                <p className="text-on-surface-variant font-label-sm">
                  <strong>Unit:</strong> {product.unit}
                </p>
              )}
              {product.quantity && (
                <p className="text-on-surface-variant font-label-sm">
                  <strong>Available Quantity:</strong> {product.quantity} {product.unit || "units"}
                </p>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-gutter border-t border-b border-gray-100 py-md">
              <span className="font-headline-md text-[18px]">Quantity</span>
              <div className="flex items-center bg-surface-container-low rounded-xl p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white transition-all text-on-surface"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <span className="px-gutter font-headline-md text-[18px]">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.quantity || Number.MAX_SAFE_INTEGER, quantity + 1))}
                  disabled={!!product.quantity && quantity >= product.quantity}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white transition-all text-on-surface"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
              <span className="text-on-surface-variant font-label-sm">{product.unit || "units"}</span>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex gap-gutter mt-base">
              <button
                onClick={handleChatWithFarmer}
                disabled={chatLoading}
                className="flex-1 h-[48px] border-2 border-primary text-primary font-label-sm rounded-xl hover:bg-green-50 transition-all flex items-center justify-center gap-2 active:scale-95 duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chatLoading ? (
                  <><span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></span>Starting...</>
                ) : (
                  <><span className="material-symbols-outlined">chat</span>Chat with Farmer</>
                )}
              </button>
              <button
                onClick={handleAddToCart}
                className={`flex-[1.5] h-[48px] font-label-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 duration-150 ${
                  addedToCart || alreadyInCart
                    ? 'bg-green-700 text-white'
                    : 'bg-[#1B6D24] text-white hover:opacity-90'
                }`}
              >
                <span className="material-symbols-outlined">
                  {addedToCart || alreadyInCart ? 'check_circle' : 'shopping_cart'}
                </span>
                {addedToCart ? 'Added!' : alreadyInCart ? 'In Cart' : 'Add to Cart'}
              </button>
              <button
                onClick={handleToggleWishlist}
                disabled={wishlistLoading}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                className={`h-[48px] w-[48px] flex items-center justify-center rounded-xl border-2 transition-all active:scale-95 duration-150 disabled:opacity-50 ${
                  inWishlist ? 'border-error text-error bg-error/5' : 'border-outline-variant text-on-surface-variant hover:border-error hover:text-error'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: inWishlist ? "'FILL' 1" : "'FILL' 0" }}>
                  favorite
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <section className="mt-xl border-t border-gray-100 pt-xl pb-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-base mb-lg">
            <div>
              <h2 className="font-headline-lg mb-xs">Customer Reviews</h2>
              <div className="flex items-center gap-md">
                <div className="flex text-tertiary">
                  {renderStars(reviewsAvg)}
                </div>
                <span className="font-headline-md">
                  {reviewsAvg > 0 ? `${reviewsAvg} / 5.0` : 'No ratings yet'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowReviewForm((p) => !p)}
              className="text-primary font-label-sm flex items-center gap-1 hover:underline"
            >
              {showReviewForm ? 'Cancel' : 'Write a Review'}
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="mb-lg p-md bg-white border border-gray-200 rounded-xl max-w-lg">
              <h3 className="font-headline-md mb-md">Your Review</h3>
              {/* Star Selector */}
              <div className="flex gap-1 mb-md">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setNewRating(star)}
                    className="text-tertiary"
                  >
                    <span
                      className="material-symbols-outlined text-[28px]"
                      style={{ fontVariationSettings: star <= newRating ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </span>
                  </button>
                ))}
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none mb-md"
              />
              {reviewError && (
                <p className="text-red-500 text-sm mb-md">{reviewError}</p>
              )}
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="px-6 py-2 bg-[#1B6D24] text-white rounded-lg font-label-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          )}

          {/* Review Cards */}
          {reviewsLoading ? (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-on-surface-variant font-body-md">No reviews yet. Be the first to review!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {reviews.map((review) => {
                const initials = review.buyerName
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={review._id}
                    className="p-md bg-white border border-gray-200 rounded-xl hover:shadow-[0px_10px_30px_rgba(27,109,36,0.05)] transition-shadow"
                  >
                    <div className="flex items-center gap-base mb-base">
                      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center font-headline-md text-[14px]">
                        {initials}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-label-sm">{review.buyerName}</h5>
                        <div className="flex text-tertiary scale-75 origin-left">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </div>
                    <p className="text-on-surface-variant font-body-md text-sm">
                      {review.comment || <em>No comment</em>}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Sticky Mobile Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-gutter py-md flex gap-base z-[60] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          onClick={handleChatWithFarmer}
          disabled={chatLoading}
          className="flex-1 h-[48px] border-2 border-primary text-primary font-label-sm rounded-xl flex items-center justify-center gap-1 active:scale-95 duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {chatLoading ? (
            <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></span>
          ) : (
            <><span className="material-symbols-outlined text-[20px]">chat</span>Chat</>
          )}
        </button>
        <button
          onClick={handleAddToCart}
          className={`flex-[2] h-[48px] font-label-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 duration-150 shadow-md ${
            addedToCart || alreadyInCart ? 'bg-green-700 text-white' : 'bg-[#1B6D24] text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {addedToCart || alreadyInCart ? 'check_circle' : 'shopping_cart'}
          </span>
          {addedToCart ? 'Added!' : alreadyInCart ? 'In Cart' : 'Add to Cart'}
        </button>
        <button
          onClick={handleToggleWishlist}
          disabled={wishlistLoading}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className={`h-[48px] w-[48px] flex items-center justify-center rounded-xl border-2 active:scale-95 duration-150 disabled:opacity-50 ${
            inWishlist ? 'border-error text-error bg-error/5' : 'border-outline-variant text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: inWishlist ? "'FILL' 1" : "'FILL' 0" }}>
            favorite
          </span>
        </button>
      </div>
    </div>
  );
}
