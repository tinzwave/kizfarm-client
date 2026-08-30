// Buyer-facing mutations backed by Supabase — plain CRUD (addresses, cart)
// goes straight to the table via RLS; money/inventory-critical actions
// (checkout, pay, cancel, confirm receipt, rate driver) go through the
// RPCs built in the migration's Phase 4. Same response-shape shim as
// supabase-data.ts, for the same reason: minimize churn in existing pages.
import { createClient } from "./supabase-client";
import { getAdminFarmerSuspensionEligibility, getAdminBuyerSuspensionEligibility } from "./supabase-data";

function toAddress(a: any) {
  return {
    _id: a.id,
    label: a.label,
    street: a.street,
    city: a.city,
    state: a.state,
    country: a.country,
    phone: a.phone,
    isDefault: a.is_default,
  };
}

export async function getAddresses() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, addresses: (data || []).map(toAddress) } };
}

export async function createAddress(input: {
  label?: string;
  street: string;
  city: string;
  state: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  if (input.isDefault) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      user_id: user.id,
      label: input.label || "Home",
      street: input.street,
      city: input.city,
      state: input.state,
      country: input.country || "Nigeria",
      phone: input.phone,
      is_default: !!input.isDefault,
    })
    .select()
    .single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, address: toAddress(data) } };
}

export async function updateAddress(
  id: string,
  input: Partial<{ label: string; street: string; city: string; state: string; country: string; phone: string; isDefault: boolean }>,
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  if (input.isDefault) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id).neq("id", id);
  }

  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) patch.label = input.label;
  if (input.street !== undefined) patch.street = input.street;
  if (input.city !== undefined) patch.city = input.city;
  if (input.state !== undefined) patch.state = input.state;
  if (input.country !== undefined) patch.country = input.country;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.isDefault !== undefined) patch.is_default = input.isDefault;

  const { data, error } = await supabase.from("addresses").update(patch).eq("id", id).select().single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, address: toAddress(data) } };
}

export async function deleteAddress(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

// ===================== CHECKOUT / ORDERS =====================

function toOrder(o: any) {
  return {
    _id: o.id,
    masterOrderId: o.master_order_id,
    subOrderIndex: o.sub_order_index,
    subOrderCount: o.sub_order_count,
    status: o.status,
    subtotal: o.subtotal,
    deliveryFee: o.delivery_fee,
    serviceFee: o.service_fee,
    total: o.total,
    paymentMethod: o.payment_method,
    paymentReference: o.payment_reference,
    paymentStatus: o.payment_status,
  };
}

export async function confirmReceipt(orderId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("buyer_confirm_receipt", { p_order_id: orderId });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, order: toOrder(data) } };
}

export async function rateDriver(orderId: string, rating: number) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("buyer_rate_driver", { p_order_id: orderId, p_rating: rating });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, driver: data } };
}

export async function cancelOrder(orderId: string, reason?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("buyer_cancel_order", { p_order_id: orderId, p_reason: reason || null });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, order: toOrder(data) } };
}

// Sets the reference the checkout is about to pay with *before* the
// Paystack widget opens, so the paystack-webhook Edge Function has
// something reliable to match against even if it arrives before this
// tab's own callback does. Must be called with the exact same reference
// passed as `ref` into PaystackPop.setup(...).
export async function setOrderPaymentReference(orderId: string, reference: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_order_payment_reference", { p_order_id: orderId, p_reference: reference });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

// Calls the verify-and-pay-order Edge Function, which independently
// re-verifies the payment with Paystack before marking the order paid --
// never trusts the client's word that payment succeeded.
export async function payOrder(orderId: string, paymentReference: string, paymentMethod?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("verify-and-pay-order", {
    body: { orderId, paymentReference, paymentMethod },
  });
  if (error) {
    const message = (await error.context?.json?.().catch(() => null))?.error || error.message;
    return { res: { ok: false } as Response, payload: { error: message } };
  }
  return { res: { ok: true } as Response, payload: { ok: true, order: toOrder(data.order) } };
}

// ===================== FARMER ORDER ACTIONS =====================

export async function farmerAcceptOrder(orderId: string, notes?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("farmer_accept_order", { p_order_id: orderId, p_notes: notes || null });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, order: data } };
}

export async function farmerPackOrder(orderId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("farmer_pack_order", { p_order_id: orderId });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, order: data } };
}

export async function farmerRejectOrder(orderId: string, reason?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("farmer_reject_order", { p_order_id: orderId, p_reason: reason || null });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, order: data } };
}

// ===================== ADMIN ORDER ACTIONS =====================

export async function adminSetOrderStatus(orderId: string, status: string, notes?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_set_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_notes: notes || null,
  });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, order: data } };
}

export async function adminSetTransportFare(orderId: string, transportFare: number, notes?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_set_transport_fare", {
    p_order_id: orderId,
    p_transport_fare: transportFare,
    p_notes: notes || null,
  });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, order: data } };
}

export async function adminAssignDriver(orderId: string, driverId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_assign_driver", { p_order_id: orderId, p_driver_id: driverId });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, order: data } };
}

// Enforces the "no driver assigned, not already in transit/delivered" guard
// server-side (the old Express admin.mjs only checked this client-side via
// a separate /can-cancel lookup before the actual cancel call, so a direct
// PATCH could bypass it -- this RPC closes that gap).
export async function adminCancelOrder(orderId: string, reason?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_cancel_order", { p_order_id: orderId, p_reason: reason || null });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, order: data } };
}

export async function releaseEscrowToFarmer(escrowId: string, releaseNotes?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("release_escrow_to_farmer", {
    p_escrow_id: escrowId,
    p_release_notes: releaseNotes || null,
  });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, escrow: data } };
}

export async function adminRefundEscrow(escrowId: string, refundReason?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_refund_escrow", {
    p_escrow_id: escrowId,
    p_refund_reason: refundReason || null,
  });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, escrow: data } };
}

// ===================== ADMIN: DRIVERS =====================

function toDriver(d: any) {
  return {
    _id: d.id,
    name: d.name,
    phone: d.phone,
    vehicleType: d.vehicle_type,
    vehiclePlate: d.vehicle_plate,
    currentLocation: d.current_location,
    status: d.status,
    totalDeliveries: d.total_deliveries,
    averageRating: d.average_rating,
    ratingCount: d.rating_count,
    vehicleImages: d.vehicle_images || [],
    createdAt: d.created_at,
  };
}

export async function createDriver(input: {
  name: string;
  phone: string;
  vehicleType: string;
  vehiclePlate?: string;
  currentLocation?: string;
  vehicleImage?: File | null;
}) {
  const supabase = createClient();
  const vehicleImages: string[] = [];

  if (input.vehicleImage) {
    const ext = input.vehicleImage.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("driver-images").upload(path, input.vehicleImage);
    if (uploadError) return { res: { ok: false } as Response, payload: { error: uploadError.message } };
    const { data: publicUrl } = supabase.storage.from("driver-images").getPublicUrl(path);
    vehicleImages.push(publicUrl.publicUrl);
  }

  const { data, error } = await supabase
    .from("drivers")
    .insert({
      name: input.name,
      phone: input.phone,
      vehicle_type: input.vehicleType,
      vehicle_plate: input.vehiclePlate || null,
      current_location: input.currentLocation || null,
      vehicle_images: vehicleImages,
      status: "active",
    })
    .select()
    .single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, driver: toDriver(data) } };
}

// ===================== FARMER VERIFICATION =====================

async function uploadKycFile(supabase: ReturnType<typeof createClient>, userId: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("farmer-kyc").upload(path, file);
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("farmer-kyc").getPublicUrl(path);
  return data.publicUrl;
}

export async function submitFarmerVerification(input: {
  bvn?: string;
  nin?: string;
  farmAddress?: string;
  bvnFile?: File | null;
  govIdFile?: File | null;
  selfieFile?: File | null;
  farmerImageFile?: File | null;
  validIdImageFile?: File | null;
  farmImageFiles?: File[];
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  try {
    const [bvnUrl, govIdUrl, selfieUrl, farmerImageUrl, validIdImageUrl] = await Promise.all([
      input.bvnFile ? uploadKycFile(supabase, user.id, input.bvnFile) : Promise.resolve(undefined),
      input.govIdFile ? uploadKycFile(supabase, user.id, input.govIdFile) : Promise.resolve(undefined),
      input.selfieFile ? uploadKycFile(supabase, user.id, input.selfieFile) : Promise.resolve(undefined),
      input.farmerImageFile ? uploadKycFile(supabase, user.id, input.farmerImageFile) : Promise.resolve(undefined),
      input.validIdImageFile ? uploadKycFile(supabase, user.id, input.validIdImageFile) : Promise.resolve(undefined),
    ]);

    let farmImageUrls: string[] | undefined;
    if (input.farmImageFiles && input.farmImageFiles.length > 0) {
      if (input.farmImageFiles.length !== 5) {
        return { res: { ok: false } as Response, payload: { error: "Exactly 5 farm images are required" } };
      }
      farmImageUrls = await Promise.all(input.farmImageFiles.map((f) => uploadKycFile(supabase, user.id, f)));
    }

    const { data, error } = await supabase.rpc("submit_farmer_verification", {
      p_bvn: input.bvn || null,
      p_nin: input.nin || null,
      p_farm_address: input.farmAddress || null,
      p_bvn_url: bvnUrl || null,
      p_gov_id_url: govIdUrl || null,
      p_selfie_url: selfieUrl || null,
      p_farmer_image_url: farmerImageUrl || null,
      p_valid_id_image_url: validIdImageUrl || null,
      p_farm_image_url: null,
      p_farm_image_urls: farmImageUrls || null,
    });
    if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
    return { res: { ok: true } as Response, payload: { ok: true, farmer: data } };
  } catch (err) {
    return { res: { ok: false } as Response, payload: { error: err instanceof Error ? err.message : "Upload failed" } };
  }
}

export async function adminReviewFarmer(farmerId: string, approved: boolean, rejectionReason?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_review_farmer", {
    p_farmer_id: farmerId,
    p_approved: approved,
    p_rejection_reason: rejectionReason || null,
  });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, farmer: data } };
}

// ===================== ADMIN: BLOG CMS =====================

function toBlogPost(b: any) {
  return {
    _id: b.id,
    title: b.title,
    slug: b.slug,
    summary: b.summary,
    content: b.content,
    coverImage: b.cover_image,
    category: b.category,
    readTime: b.read_time,
    author: b.author,
    status: b.status,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

async function generateUniqueSlug(supabase: ReturnType<typeof createClient>, title: string) {
  let baseSlug = title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/-{2,}/g, "-");
  if (!baseSlug) baseSlug = "post";

  let slug = baseSlug;
  let count = 1;
  while (true) {
    const { data } = await supabase.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${count}`;
    count++;
  }
}

export async function uploadBlogImage(file: File) {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("blog-covers").upload(path, file);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  const { data } = supabase.storage.from("blog-covers").getPublicUrl(path);
  return { res: { ok: true } as Response, payload: { ok: true, imageUrl: data.publicUrl } };
}

export async function createBlogPost(input: {
  title: string;
  summary?: string;
  content: string;
  coverImage?: string;
  category?: string;
  readTime?: number;
  status?: "draft" | "published";
}) {
  const supabase = createClient();
  const slug = await generateUniqueSlug(supabase, input.title);
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title: input.title,
      slug,
      summary: input.summary || null,
      content: input.content,
      cover_image: input.coverImage || null,
      category: input.category || "General",
      read_time: input.readTime ?? 5,
      status: input.status || "published",
      author: "KizFarm Admin",
    })
    .select()
    .single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, post: toBlogPost(data) } };
}

export async function updateBlogPost(
  id: string,
  input: {
    title?: string;
    summary?: string;
    content?: string;
    coverImage?: string;
    category?: string;
    readTime?: number;
    status?: "draft" | "published";
  },
) {
  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase.from("blog_posts").select("title").eq("id", id).single();
  if (fetchError || !existing) return { res: { ok: false } as Response, payload: { error: fetchError?.message || "Blog post not found" } };

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.summary !== undefined) patch.summary = input.summary;
  if (input.content !== undefined) patch.content = input.content;
  if (input.coverImage !== undefined) patch.cover_image = input.coverImage;
  if (input.category !== undefined) patch.category = input.category;
  if (input.readTime !== undefined) patch.read_time = input.readTime;
  if (input.status !== undefined) patch.status = input.status;

  if (input.title !== undefined && input.title !== existing.title) {
    patch.slug = await generateUniqueSlug(supabase, input.title);
  }

  const { data, error } = await supabase.from("blog_posts").update(patch).eq("id", id).select().single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, post: toBlogPost(data) } };
}

export async function deleteBlogPost(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

// ===================== LEARNING HUB =====================

function toTutor(t: any) {
  return { _id: t.id, name: t.name, description: t.description, phone: t.phone, whatsapp: t.whatsapp, imageUrl: t.image_url };
}

function toCourse(c: any) {
  return {
    _id: c.id,
    title: c.title,
    description: c.description,
    price: c.price,
    finalPrice: c.final_price,
    commission: c.commission,
    content: c.content,
    source: c.source,
    audience: c.audience,
    status: c.status,
    rejectionReason: c.rejection_reason,
    isPublished: c.is_published,
    createdAt: c.created_at,
    tutor: c.tutors ? toTutor(c.tutors) : undefined,
    creator: c.profiles ? { _id: c.profiles.id, name: c.profiles.name, email: c.profiles.email } : undefined,
  };
}

const COURSE_SELECT = "*, tutors(*), profiles!creator_id(id, name, email)";

export async function createTutor(input: { name: string; description: string; phone: string; whatsapp: string; imageFile: File }) {
  const supabase = createClient();
  const ext = input.imageFile.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("tutor-images").upload(path, input.imageFile);
  if (uploadError) return { res: { ok: false } as Response, payload: { error: uploadError.message } };
  const { data: publicUrl } = supabase.storage.from("tutor-images").getPublicUrl(path);

  const { data, error } = await supabase
    .from("tutors")
    .insert({
      name: input.name,
      description: input.description,
      phone: input.phone,
      whatsapp: input.whatsapp,
      image_url: publicUrl.publicUrl,
    })
    .select()
    .single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, tutor: toTutor(data) } };
}

export async function createAdminCourse(input: { title: string; description: string; price: number; tutorId: string; content: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: input.title,
      description: input.description,
      price: input.price,
      final_price: input.price,
      content: input.content,
      tutor_id: input.tutorId,
      source: "admin",
      audience: "farmers",
      status: "approved",
      is_published: true,
    })
    .select(COURSE_SELECT)
    .single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, course: toCourse(data) } };
}

export async function createBuyerCourse(input: { title: string; description: string; price: number; content: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: input.title,
      description: input.description,
      price: input.price,
      final_price: input.price,
      content: input.content,
      creator_id: user.id,
      source: "buyer",
      audience: "all",
      status: "pending",
      is_published: false,
    })
    .select(COURSE_SELECT)
    .single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, course: toCourse(data) } };
}

export async function updateBuyerCourse(id: string, input: { title: string; description: string; price: number; content: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({
      title: input.title,
      description: input.description,
      price: input.price,
      final_price: input.price,
      commission: 0,
      content: input.content,
      status: "pending",
      is_published: false,
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq("id", id)
    .select(COURSE_SELECT)
    .single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, course: toCourse(data) } };
}

export async function adminReviewBuyerCourse(courseId: string, approved: boolean, commission?: number, rejectionReason?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_review_buyer_course", {
    p_course_id: courseId,
    p_approved: approved,
    p_commission: commission ?? 0,
    p_rejection_reason: rejectionReason || null,
  });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, course: data } };
}

export async function releaseCoursePayout(subscriptionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("release_course_payout", { p_subscription_id: subscriptionId });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, purchase: data } };
}

// Calls the purchase-course Edge Function, which independently re-verifies
// the payment with Paystack before activating the subscription -- never
// trusts the client's word that payment succeeded.
export async function purchaseCourse(courseId: string, paymentReference: string) {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("purchase-course", {
    body: { courseId, paymentReference },
  });
  if (error) {
    const message = (await error.context?.json?.().catch(() => null))?.error || error.message;
    return { res: { ok: false } as Response, payload: { error: message } };
  }
  return { res: { ok: true } as Response, payload: { ok: true, subscription: data.subscription } };
}

// ===================== CHAT =====================

function toChat(c: any) {
  return {
    _id: c.id,
    buyerId: c.buyer ? { _id: c.buyer.id, name: c.buyer.name, email: c.buyer.email, phone: c.buyer.phone } : { _id: c.buyer_id },
    farmerId: c.farmer ? { _id: c.farmer.id, name: c.farmer.name, email: c.farmer.email, phone: c.farmer.phone } : { _id: c.farmer_id },
    productId: c.products
      ? { _id: c.products.id, name: c.products.name, price: c.products.price, images: c.products.images || [] }
      : { _id: c.product_id },
    lastMessage: c.last_message,
    lastMessageTime: c.last_message_time,
    isActive: c.is_active,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function toMessage(m: any) {
  return {
    _id: m.id,
    chatId: m.chat_id,
    senderId: m.sender ? { _id: m.sender.id, name: m.sender.name, email: m.sender.email, role: m.sender.role } : { _id: m.sender_id },
    receiverId: m.receiver_id,
    content: m.content,
    messageType: m.message_type,
    attachmentUrl: m.attachment_url,
    attachmentType: m.attachment_type,
    isRead: m.is_read,
    deliveryStatus: m.delivery_status,
    createdAt: m.created_at,
  };
}

const CHAT_SELECT = "*, buyer:profiles!buyer_id(id, name, email, phone), farmer:profiles!farmer_id(id, name, email, phone), products(id, name, price, images)";

// Buyer-only, matching the chats_insert RLS policy -- a farmer can reply
// inside an existing chat but never originate one.
export async function startChat(productId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data: product, error: productError } = await supabase.from("products").select("id, user_id").eq("id", productId).single();
  if (productError || !product) return { res: { ok: false } as Response, payload: { error: "Product not found" } };

  const { data: existing } = await supabase
    .from("chats")
    .select(CHAT_SELECT)
    .eq("buyer_id", user.id)
    .eq("farmer_id", product.user_id)
    .eq("product_id", productId)
    .maybeSingle();
  if (existing) return { res: { ok: true } as Response, payload: { ok: true, chat: toChat(existing) } };

  const { data, error } = await supabase
    .from("chats")
    .insert({ buyer_id: user.id, farmer_id: product.user_id, product_id: productId })
    .select(CHAT_SELECT)
    .single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, chat: toChat(data) } };
}

export async function sendMessage(chatId: string, content: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("send_chat_message", {
    p_chat_id: chatId,
    p_content: content,
    p_message_type: "text",
  });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };

  // The RPC returns the raw row; re-fetch with the sender embed so the
  // caller gets the same shape getMessages() returns.
  const { data: full } = await supabase.from("messages").select("*, sender:profiles!sender_id(id, name, email, role)").eq("id", data.id).single();
  return { res: { ok: true } as Response, payload: { ok: true, message: toMessage(full || data) } };
}

export async function sendAttachment(chatId: string, file: File, caption?: string) {
  const supabase = createClient();
  const isImage = file.type.startsWith("image/");
  const ext = file.name.split(".").pop() || "bin";
  const path = `${chatId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("chat-attachments").upload(path, file);
  if (uploadError) return { res: { ok: false } as Response, payload: { error: uploadError.message } };

  const { data, error } = await supabase.rpc("send_chat_message", {
    p_chat_id: chatId,
    p_content: caption || "",
    p_message_type: isImage ? "image" : "file",
    p_attachment_url: path,
    p_attachment_type: file.type,
  });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };

  const { data: full } = await supabase.from("messages").select("*, sender:profiles!sender_id(id, name, email, role)").eq("id", data.id).single();
  return { res: { ok: true } as Response, payload: { ok: true, message: toMessage(full || data) } };
}

export async function markMessagesAsRead(messageIds: string[]) {
  if (messageIds.length === 0) return { res: { ok: true } as Response, payload: { ok: true } };
  const supabase = createClient();
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true, read_at: new Date().toISOString(), delivery_status: "read" })
    .in("id", messageIds);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

export async function placeOrder(input: {
  items: { productId: string; quantity: number }[];
  addressId?: string;
  address?: Record<string, unknown>;
  paymentMethod?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_split_orders", {
    p_items: input.items,
    p_address_id: input.addressId || null,
    p_address: input.address || null,
    p_payment_method: input.paymentMethod || "card",
  });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, orders: (data || []).map(toOrder) } };
}

function toFarmerProduct(p: any) {
  return {
    _id: p.id,
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category,
    unit: p.unit,
    quantity: p.quantity,
    moistureCode: p.moisture_code,
    images: p.images || [],
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export async function createFarmerProduct(input: {
  name: string;
  description: string;
  category?: string;
  price: number;
  unit?: string;
  quantity?: number;
  moistureCode?: string;
  images?: File[];
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data: farmer } = await supabase.from("farmers").select("id").eq("user_id", user.id).single();
  if (!farmer) return { res: { ok: false } as Response, payload: { error: "Farmer record not found" } };

  const imageUrls: string[] = [];
  for (const file of input.images || []) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${farmer.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file);
    if (uploadError) return { res: { ok: false } as Response, payload: { error: uploadError.message } };
    const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
    imageUrls.push(publicUrl.publicUrl);
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      farmer_id: farmer.id,
      user_id: user.id,
      name: input.name,
      description: input.description,
      category: input.category || null,
      price: input.price,
      unit: input.unit || null,
      quantity: input.quantity ?? null,
      moisture_code: input.moistureCode || null,
      images: imageUrls,
    })
    .select()
    .single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, product: toFarmerProduct(data) } };
}

export async function updateFarmerProduct(
  id: string,
  input: {
    name?: string;
    description?: string;
    category?: string;
    price?: number;
    unit?: string;
    quantity?: number;
    moistureCode?: string;
  },
) {
  const supabase = createClient();
  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.description !== undefined) update.description = input.description;
  if (input.category !== undefined) update.category = input.category;
  if (input.price !== undefined) update.price = input.price;
  if (input.unit !== undefined) update.unit = input.unit;
  if (input.quantity !== undefined) update.quantity = input.quantity;
  if (input.moistureCode !== undefined) update.moisture_code = input.moistureCode;

  const { data, error } = await supabase.from("products").update(update).eq("id", id).select().single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, product: toFarmerProduct(data) } };
}

export async function submitReview(productId: string, input: { rating: number; comment?: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();

  const { error } = await supabase
    .from("reviews")
    .upsert(
      {
        product_id: productId,
        buyer_id: user.id,
        rating: input.rating,
        comment: input.comment || "",
        buyer_name: profile?.name || "Anonymous",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,buyer_id" },
    );
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

export async function submitCourseReview(courseId: string, input: { rating: number; comment?: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();

  const { error } = await supabase
    .from("course_reviews")
    .upsert(
      {
        course_id: courseId,
        buyer_id: user.id,
        rating: input.rating,
        comment: input.comment || "",
        buyer_name: profile?.name || "Anonymous",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "course_id,buyer_id" },
    );
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

export async function saveFarmerBankDetails(input: {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  branchCode?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { error } = await supabase
    .from("farmers")
    .update({
      bank_name: input.bankName,
      account_holder_name: input.accountHolderName,
      account_number: input.accountNumber,
      branch_code: input.branchCode || null,
      bank_verified: false,
    })
    .eq("user_id", user.id);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      bankDetails: {
        bankName: input.bankName,
        accountHolderName: input.accountHolderName,
        accountNumber: input.accountNumber,
        branchCode: input.branchCode || "",
        isVerified: false,
      },
    },
  };
}

export async function deleteAdminProduct(productId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

export async function suspendAdminFarmer(farmerId: string, reason?: string) {
  const supabase = createClient();
  const { data: farmer, error: farmerError } = await supabase.from("farmers").select("user_id").eq("id", farmerId).single();
  if (farmerError || !farmer) return { res: { ok: false } as Response, payload: { error: "Farmer not found" } };

  const { res: eligibilityRes, payload: eligibilityPayload } = await getAdminFarmerSuspensionEligibility(farmerId);
  if (!eligibilityRes.ok) return { res: { ok: false } as Response, payload: { error: eligibilityPayload.error } };
  if ((eligibilityPayload.activeOrdersCount ?? 0) > 0) {
    return { res: { ok: false } as Response, payload: { error: "This farmer has active orders and cannot be suspended." } };
  }
  if (eligibilityPayload.hasPendingEscrow) {
    return { res: { ok: false } as Response, payload: { error: "This farmer cannot be suspended because they have unreleased payments in escrow." } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ status: "suspended", suspension_reason: reason || null, suspended_at: new Date().toISOString() })
    .eq("id", farmer.user_id);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

export async function unsuspendAdminFarmer(farmerId: string) {
  const supabase = createClient();
  const { data: farmer, error: farmerError } = await supabase.from("farmers").select("user_id").eq("id", farmerId).single();
  if (farmerError || !farmer) return { res: { ok: false } as Response, payload: { error: "Farmer not found" } };

  const { error } = await supabase
    .from("profiles")
    .update({ status: "active", suspension_reason: null, suspended_at: null })
    .eq("id", farmer.user_id);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

// Hard-deleting a farmer's account isn't possible from the browser client
// (would need the service-role key) and would fail on foreign-key
// constraints anyway once they have any order/escrow history (Postgres
// enforces referential integrity that the old MongoDB backend never had).
// Deactivating blocks login while preserving order/financial history.
export async function deactivateAdminFarmer(farmerId: string) {
  const supabase = createClient();
  const { data: farmer, error: farmerError } = await supabase.from("farmers").select("user_id").eq("id", farmerId).single();
  if (farmerError || !farmer) return { res: { ok: false } as Response, payload: { error: "Farmer not found" } };

  const { error } = await supabase.from("profiles").update({ status: "deactivated" }).eq("id", farmer.user_id);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

export async function suspendAdminBuyer(userId: string, reason?: string) {
  const supabase = createClient();
  const { res: eligibilityRes, payload: eligibilityPayload } = await getAdminBuyerSuspensionEligibility(userId);
  if (!eligibilityRes.ok) return { res: { ok: false } as Response, payload: { error: eligibilityPayload.error } };
  if ((eligibilityPayload.activeOrdersCount ?? 0) > 0) {
    return { res: { ok: false } as Response, payload: { error: "This buyer has an active order and cannot be suspended." } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ status: "suspended", suspension_reason: reason || null, suspended_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

export async function unsuspendAdminBuyer(userId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status: "active", suspension_reason: null, suspended_at: null })
    .eq("id", userId);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

// See deactivateAdminFarmer above for why this deactivates rather than
// hard-deletes.
export async function deactivateAdminBuyer(userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ status: "deactivated" }).eq("id", userId);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

export async function deleteAdminReview(reviewId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}

export async function updateMyFullProfile(input: {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  farmName?: string;
  farmType?: string;
  location?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const profileUpdate: Record<string, unknown> = {};
  if (input.name !== undefined) profileUpdate.name = input.name;
  if (input.phone !== undefined) profileUpdate.phone = input.phone;
  if (input.address !== undefined) profileUpdate.address = input.address;
  if (input.city !== undefined) profileUpdate.city = input.city;
  if (input.state !== undefined) profileUpdate.state = input.state;
  if (input.country !== undefined) profileUpdate.country = input.country;

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
    if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "farmer") {
    const farmerUpdate: Record<string, unknown> = {};
    if (input.farmName !== undefined) farmerUpdate.farm_name = input.farmName;
    if (input.farmType !== undefined) farmerUpdate.farm_type = input.farmType;
    if (input.location !== undefined) farmerUpdate.location = input.location;
    if (Object.keys(farmerUpdate).length > 0) {
      const { error } = await supabase.from("farmers").update(farmerUpdate).eq("user_id", user.id);
      if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
    }
  }

  return { res: { ok: true } as Response, payload: { ok: true } };
}

export async function registerAsFarmer(input: {
  fullName: string;
  farmName: string;
  phone: string;
  location: string;
  farmType: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data: existing } = await supabase.from("farmers").select("id").eq("user_id", user.id).maybeSingle();
  if (existing) return { res: { ok: false } as Response, payload: { error: "Already registered" } };

  const { data, error } = await supabase
    .from("farmers")
    .insert({
      user_id: user.id,
      full_name: input.fullName,
      farm_name: input.farmName,
      phone: input.phone,
      location: input.location,
      farm_type: input.farmType,
      status: "draft",
    })
    .select()
    .single();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, farmer: { _id: data.id, status: data.status } } };
}

export async function addToWishlist(productId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { error } = await supabase
    .from("wishlists")
    .insert({ buyer_id: user.id, product_id: productId });
  // Already-in-wishlist is not an error from the caller's point of view.
  if (error && error.code !== "23505") {
    return { res: { ok: false } as Response, payload: { error: error.message } };
  }
  return { res: { ok: true } as Response, payload: { ok: true } };
}

export async function removeFromWishlist(productId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("buyer_id", user.id)
    .eq("product_id", productId);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true } };
}
