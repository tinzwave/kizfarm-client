// Read-only data-fetching helpers backed by Supabase, shaped to match the
// OLD Express API's response envelopes (same field names: _id, camelCase,
// nested farmerId: {_id, farmName, location}) so existing page components
// only need their fetch call swapped, not their rendering/interfaces.
// New pages built from scratch should prefer plain Postgres field names
// instead of extending this shim.
import { createClient } from "./supabase-client";

// The `farmers` table is RLS-restricted to its owner + admin (it holds
// BVN/bank details), so PostgREST's automatic embed (`products.farmer_id ->
// farmers`) silently returns null for any other viewer -- there's no error,
// it just can't see through the RLS on the base table. Public-safe fields
// (name, location, status) live in the `farmer_public_profile` view instead,
// which has no FK PostgREST can auto-embed through, so we join it manually.
async function attachFarmerProfiles<T extends { farmer_id: string }>(
  supabase: ReturnType<typeof createClient>,
  rows: T[],
): Promise<Map<string, { id: string; farm_name: string | null; location: string | null }>> {
  const ids = Array.from(new Set(rows.map((r) => r.farmer_id).filter(Boolean)));
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("farmer_public_profile").select("id, farm_name, location").in("id", ids);
  return new Map((data || []).map((f) => [f.id, f]));
}

function toProduct(p: any, farmerMap: Map<string, any>) {
  const farmer = farmerMap.get(p.farmer_id);
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
    farmerId: farmer ? { _id: farmer.id, farmName: farmer.farm_name, location: farmer.location } : null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export async function getMarketplaceProducts({ category, q }: { category?: string; q?: string } = {}) {
  const supabase = createClient();
  let query = supabase.from("products").select("*").neq("quantity", 0).order("created_at", { ascending: false });

  if (category) query = query.ilike("category", category);
  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  const farmerMap = await attachFarmerProfiles(supabase, data || []);
  return { res: { ok: true } as Response, payload: { ok: true, products: (data || []).map((p) => toProduct(p, farmerMap)) } };
}

export async function getProductById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error || !data) return { res: { ok: false } as Response, payload: { error: error?.message || "Product not found" } };
  const farmerMap = await attachFarmerProfiles(supabase, [data]);
  return { res: { ok: true } as Response, payload: { ok: true, product: toProduct(data, farmerMap) } };
}

export async function getProductReviews(productId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  const reviews = (data || []).map((r) => ({
    _id: r.id,
    buyerName: r.buyer_name,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  }));
  const count = reviews.length;
  const avg = count > 0 ? Number((reviews.reduce((s, r) => s + r.rating, 0) / count).toFixed(1)) : 0;
  return { res: { ok: true } as Response, payload: { ok: true, reviews, count, avg } };
}

export async function getCourseReviews(courseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("course_reviews")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  const reviews = (data || []).map((r) => ({
    _id: r.id,
    buyerName: r.buyer_name,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  }));
  const count = reviews.length;
  const avg = count > 0 ? Number((reviews.reduce((s, r) => s + r.rating, 0) / count).toFixed(1)) : 0;
  return { res: { ok: true } as Response, payload: { ok: true, reviews, count, avg } };
}

export async function getFarmerStatus() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: true } as Response, payload: { ok: true, farmer: null, profileStatus: null } };

  const [farmerRes, profileRes] = await Promise.all([
    supabase.from("farmers").select("*").eq("user_id", user.id).single(),
    supabase.from("profiles").select("status").eq("id", user.id).single(),
  ]);
  const profileStatus = profileRes.data?.status ?? null;
  if (!farmerRes.data) return { res: { ok: true } as Response, payload: { ok: true, farmer: null, profileStatus } };
  return {
    res: { ok: true } as Response,
    payload: { ok: true, farmer: { _id: farmerRes.data.id, status: farmerRes.data.status }, profileStatus },
  };
}

// farmer-kyc is a private bucket -- the *_url fields on the farmers row
// hold storage paths (see uploadKycFile in supabase-mutations.ts), not
// usable URLs. Resolve them to short-lived signed URLs at read time,
// batched into one storage call regardless of how many farmers/fields are
// involved. Falls back to the raw (unusable) value if signing fails,
// rather than throwing and breaking the whole page.
const KYC_SIGNED_URL_TTL = 60 * 60;
const KYC_SINGLE_URL_KEYS = ["bvnUrl", "govIdUrl", "selfieUrl", "farmerImageUrl", "validIdImageUrl", "farmImageUrl"] as const;

async function resolveFarmerKycUrls<T extends Record<string, any>>(
  supabase: ReturnType<typeof createClient>,
  farmers: T[],
): Promise<T[]> {
  const paths = new Set<string>();
  for (const f of farmers) {
    for (const key of KYC_SINGLE_URL_KEYS) {
      if (f[key]) paths.add(f[key]);
    }
    for (const p of f.farmImageUrls || []) {
      if (p) paths.add(p);
    }
  }
  if (paths.size === 0) return farmers;

  const { data, error } = await supabase.storage.from("farmer-kyc").createSignedUrls(Array.from(paths), KYC_SIGNED_URL_TTL);
  if (error || !data) return farmers;

  const signedByPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return farmers.map((f) => {
    const resolved: Record<string, any> = { ...f };
    for (const key of KYC_SINGLE_URL_KEYS) {
      if (f[key]) resolved[key] = signedByPath.get(f[key]) || f[key];
    }
    if (Array.isArray(f.farmImageUrls)) {
      resolved.farmImageUrls = f.farmImageUrls.map((p: string) => (p ? signedByPath.get(p) || p : p));
    }
    return resolved as T;
  });
}

export async function getMyFarmerProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data, error } = await supabase.from("farmers").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  if (!data) return { res: { ok: true } as Response, payload: { ok: true, farmer: null } };

  // Resubmitting the verification form needs to keep unchanged farm-image
  // slots as-is -- the RPC's array field is all-or-nothing (a full new set
  // of 5 or omit entirely, no per-slot merge), so the client has to send
  // back the *raw storage path* for any slot it isn't replacing. The
  // signed URLs below are display-only and can't be reused as paths (a
  // signing token isn't a valid object path for the next sign attempt).
  const farmImagePaths: string[] = data.farm_image_urls || [];

  const [farmer] = await resolveFarmerKycUrls(supabase, [
    {
      _id: data.id,
      status: data.status,
      bvn: data.bvn,
      bvnUrl: data.bvn_url,
      nin: data.nin,
      govIdUrl: data.gov_id_url,
      selfieUrl: data.selfie_url,
      farmerImageUrl: data.farmer_image_url,
      validIdImageUrl: data.valid_id_image_url,
      farmAddress: data.farm_address,
      farmImageUrl: data.farm_image_url,
      farmImageUrls: data.farm_image_urls || [],
      rejectionReason: data.rejection_reason,
    },
  ]);

  return {
    res: { ok: true } as Response,
    payload: { ok: true, farmer: { ...farmer, farmImagePaths } },
  };
}

export async function getBuyerDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const [productsRes, ordersRes, cartRes, orderCountRes, coursesRes] = await Promise.all([
    supabase.from("products").select("*").neq("quantity", 0).order("created_at", { ascending: false }).limit(8),
    supabase
      .from("orders")
      .select("id, master_order_id, status, total, farmer_id, order_items(name, quantity, image)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("carts").select("items").eq("user_id", user.id).single(),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", user.id),
    supabase
      .from("courses")
      .select(COURSE_SELECT)
      .eq("is_published", true)
      .or("source.eq.admin,and(source.eq.buyer,status.eq.approved)")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  // cartRes uses .single() and legitimately errors (no rows) for a buyer who
  // hasn't saved a cart yet -- that's handled below via `cartRes.data?.items
  // || []`, so it's excluded from this hard-failure check.
  const firstError = [productsRes, ordersRes, orderCountRes].find((r) => r.error)?.error;
  if (firstError) return { res: { ok: false } as Response, payload: { error: firstError.message } };

  const [productFarmerMap, orderFarmerMap] = await Promise.all([
    attachFarmerProfiles(supabase, productsRes.data || []),
    attachFarmerProfiles(supabase, ordersRes.data || []),
  ]);

  const products = (productsRes.data || []).map((p) => toProduct(p, productFarmerMap));
  const recentOrders = (ordersRes.data || []).map((o: any) => {
    const farmer = orderFarmerMap.get(o.farmer_id);
    return {
      _id: o.id,
      masterOrderId: o.master_order_id,
      status: o.status,
      total: o.total,
      items: o.order_items || [],
      farmerId: farmer ? { farmName: farmer.farm_name, location: farmer.location } : null,
    };
  });

  const courses = (coursesRes.data || []).map((c: any) => toCourse(c));

  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      products,
      recentOrders,
      courses,
      stats: {
        totalOrders: orderCountRes.count || 0,
        cartItems: (cartRes.data?.items || []).length,
        availableProducts: products.length,
      },
    },
  };
}

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

export async function getBlogPosts({ category, search }: { category?: string; search?: string } = {}) {
  const supabase = createClient();
  let query = supabase.from("blog_posts").select("*").eq("status", "published").order("created_at", { ascending: false });
  if (category && category !== "All") query = query.eq("category", category);
  if (search) query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, posts: (data || []).map(toBlogPost) } };
}

export async function getFarmerDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data: farmer } = await supabase.from("farmers").select("*").eq("user_id", user.id).single();
  if (!farmer) return { res: { ok: false } as Response, payload: { error: "Farmer record not found" } };

  const [productsRes, ordersRes, totalOrdersRes, activeOrdersRes, deliveredOrdersRes, paidOrdersRes, coursesRes] = await Promise.all([
    supabase.from("products").select("*").eq("farmer_id", farmer.id).order("created_at", { ascending: false }).limit(6),
    supabase
      .from("orders")
      .select("id, master_order_id, status, total, order_items(name, quantity, image), profiles!buyer_id(name, email)")
      .eq("farmer_id", farmer.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("farmer_id", farmer.id),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("farmer_id", farmer.id)
      .not("status", "in", "(delivered,receipt_confirmed,cancelled)"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("farmer_id", farmer.id)
      .in("status", ["delivered", "receipt_confirmed"]),
    supabase.from("orders").select("total").eq("farmer_id", farmer.id).eq("payment_status", "paid").neq("status", "cancelled"),
    supabase
      .from("courses")
      .select(COURSE_SELECT)
      .eq("is_published", true)
      .or("source.eq.admin,and(source.eq.buyer,status.eq.approved)")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const firstError = [productsRes, ordersRes, totalOrdersRes, activeOrdersRes, deliveredOrdersRes, paidOrdersRes].find(
    (r) => r.error,
  )?.error;
  if (firstError) return { res: { ok: false } as Response, payload: { error: firstError.message } };

  const farmerMap = await attachFarmerProfiles(supabase, [{ farmer_id: farmer.id }]);
  const products = (productsRes.data || []).map((p) => toProduct(p, farmerMap));
  const recentOrders = (ordersRes.data || []).map((o: any) => ({
    _id: o.id,
    masterOrderId: o.master_order_id,
    status: o.status,
    total: o.total,
    items: o.order_items || [],
    buyerId: o.profiles ? { name: o.profiles.name, email: o.profiles.email } : null,
  }));
  const totalSales = (paidOrdersRes.data || []).reduce((s, o: any) => s + Number(o.total || 0), 0);
  const courses = (coursesRes.data || []).map((c: any) => toCourse(c));

  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      farmer: { farmName: farmer.farm_name, fullName: farmer.full_name, location: farmer.location },
      stats: {
        totalSales,
        totalOrders: totalOrdersRes.count || 0,
        activeProducts: products.length,
        activeOrders: activeOrdersRes.count || 0,
        deliveredOrders: deliveredOrdersRes.count || 0,
      },
      products,
      recentOrders,
      courses,
    },
  };
}

export async function getAdminDashboard() {
  const supabase = createClient();

  const [
    usersCountRes,
    farmersCountRes,
    productsCountRes,
    ordersCountRes,
    paidOrdersRes,
    pendingFarmersRes,
    recentOrdersRes,
    recentProductsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("farmers").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("total, service_fee").eq("payment_status", "paid"),
    supabase.from("farmers").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("orders")
      .select("id, master_order_id, status, total, profiles!buyer_id(name, email), farmers(farm_name, full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("products")
      .select("*, farmers(farm_name, full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const firstError = [
    usersCountRes,
    farmersCountRes,
    productsCountRes,
    ordersCountRes,
    paidOrdersRes,
    pendingFarmersRes,
    recentOrdersRes,
    recentProductsRes,
  ].find((r) => r.error)?.error;
  if (firstError) return { res: { ok: false } as Response, payload: { error: firstError.message } };

  // "Revenue" is ambiguous for a marketplace where most of the order total
  // is money owed to farmers via escrow -- surface both: gross order value
  // (what buyers paid in total) and platform revenue (service_fee only,
  // the part KIZ FARM actually keeps).
  const totalOrderValue = (paidOrdersRes.data || []).reduce((s, o: any) => s + Number(o.total || 0), 0);
  const platformRevenue = (paidOrdersRes.data || []).reduce((s, o: any) => s + Number(o.service_fee || 0), 0);

  const recentOrders = (recentOrdersRes.data || []).map((o: any) => ({
    _id: o.id,
    masterOrderId: o.master_order_id,
    status: o.status,
    total: o.total,
    buyerId: o.profiles ? { name: o.profiles.name, email: o.profiles.email } : null,
    farmerId: o.farmers ? { farmName: o.farmers.farm_name, fullName: o.farmers.full_name } : null,
  }));

  const recentProducts = (recentProductsRes.data || []).map((p: any) => ({
    _id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    images: p.images || [],
    farmerId: p.farmers ? { farmName: p.farmers.farm_name, fullName: p.farmers.full_name } : null,
  }));

  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      stats: {
        totalUsers: usersCountRes.count || 0,
        totalFarmers: farmersCountRes.count || 0,
        totalProducts: productsCountRes.count || 0,
        totalOrders: ordersCountRes.count || 0,
        totalOrderValue,
        platformRevenue,
        pendingFarmers: pendingFarmersRes.count || 0,
      },
      recentOrders,
      recentProducts,
    },
  };
}

function toOrderSummary(o: any, farmerMap: Map<string, any>) {
  const farmer = farmerMap.get(o.farmer_id);
  return {
    _id: o.id,
    buyerId: o.buyer_id,
    masterOrderId: o.master_order_id,
    farmerId: farmer ? { _id: farmer.id, farmName: farmer.farm_name, location: farmer.location } : null,
    items: (o.order_items || []).map((i: any) => ({
      productId: i.product_id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      unit: i.unit,
      image: i.image,
    })),
    subtotal: o.subtotal,
    deliveryFee: o.delivery_fee,
    serviceFee: o.service_fee,
    total: o.total,
    paymentMethod: o.payment_method,
    paymentReference: o.payment_reference,
    paymentStatus: o.payment_status,
    status: o.status,
    createdAt: o.created_at,
  };
}

export async function getBuyerOrders() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };

  const farmerMap = await attachFarmerProfiles(supabase, data || []);
  return { res: { ok: true } as Response, payload: { ok: true, orders: (data || []).map((o) => toOrderSummary(o, farmerMap)) } };
}

export async function getBuyerOrderById(id: string) {
  const supabase = createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*), order_status_notes(*), drivers!orders_driver_id_fkey(id, name, phone, vehicle_type, current_location)")
    .eq("id", id)
    .single();
  if (error || !order) return { res: { ok: false } as Response, payload: { error: error?.message || "Order not found" } };

  const farmerMap = await attachFarmerProfiles(supabase, [order]);
  const farmer = farmerMap.get((order as any).farmer_id);
  // Full farmer row (for phone) is readable directly since the buyer owns this order
  // and farmers_select has no counterparty exception -- fall back to the public view's
  // fields plus a best-effort phone lookup the buyer's own order doesn't expose.

  const shaped = {
    ...toOrderSummary(order, farmerMap),
    farmerId: farmer ? { _id: farmer.id, farmName: farmer.farm_name, location: farmer.location } : null,
    driverId: (order as any).drivers
      ? {
          _id: (order as any).drivers.id,
          name: (order as any).drivers.name,
          phone: (order as any).drivers.phone,
          vehicleType: (order as any).drivers.vehicle_type,
          currentLocation: (order as any).drivers.current_location,
        }
      : null,
    adminNotes: (order as any).admin_notes,
    farmerNotes: (order as any).farmer_notes,
    cancellationReason: (order as any).cancellation_reason,
    driverRating: (order as any).driver_rating,
    driverRatedAt: (order as any).driver_rated_at,
    statusNotes: ((order as any).order_status_notes || []).map((n: any) => ({
      status: n.status,
      note: n.note,
      createdAt: n.created_at,
    })),
  };

  return { res: { ok: true } as Response, payload: { ok: true, order: shaped } };
}

function toFarmerOrderSummary(o: any) {
  return {
    _id: o.id,
    buyerId: o.profiles
      ? { _id: o.profiles.id, name: o.profiles.name, email: o.profiles.email, phone: o.profiles.phone }
      : null,
    items: (o.order_items || []).map((i: any) => ({
      productId: i.product_id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      unit: i.unit,
      image: i.image,
    })),
    subtotal: o.subtotal,
    deliveryFee: o.delivery_fee,
    serviceFee: o.service_fee,
    total: o.total,
    status: o.status,
    createdAt: o.created_at,
  };
}

export async function getFarmerOrders() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data: farmer } = await supabase.from("farmers").select("id").eq("user_id", user.id).single();
  if (!farmer) return { res: { ok: false } as Response, payload: { error: "Farmer record not found" } };

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), profiles!buyer_id(id, name, email, phone)")
    .eq("farmer_id", farmer.id)
    .order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };

  return { res: { ok: true } as Response, payload: { ok: true, orders: (data || []).map(toFarmerOrderSummary) } };
}

export async function getFarmerOrderById(id: string) {
  const supabase = createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "*, order_items(*), profiles!buyer_id(id, name, email, phone), drivers!orders_driver_id_fkey(id, name, phone, vehicle_type)",
    )
    .eq("id", id)
    .single();
  if (error || !order) return { res: { ok: false } as Response, payload: { error: error?.message || "Order not found" } };

  const shaped = {
    ...toFarmerOrderSummary(order),
    driverId: (order as any).drivers
      ? {
          _id: (order as any).drivers.id,
          name: (order as any).drivers.name,
          phone: (order as any).drivers.phone,
          vehicleType: (order as any).drivers.vehicle_type,
        }
      : null,
    deliveryAddress: {
      label: (order as any).delivery_label,
      street: (order as any).delivery_street,
      city: (order as any).delivery_city,
      state: (order as any).delivery_state,
      phone: (order as any).delivery_phone,
    },
    farmerNotes: (order as any).farmer_notes,
    adminNotes: (order as any).admin_notes,
    cancellationReason: (order as any).cancellation_reason,
  };

  return { res: { ok: true } as Response, payload: { ok: true, order: shaped } };
}

export async function getAdminBlogPosts() {
  const supabase = createClient();
  const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, posts: (data || []).map(toBlogPost) } };
}

export async function getAdminBlogPostById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).single();
  if (error || !data) return { res: { ok: false } as Response, payload: { error: error?.message || "Blog post not found" } };
  return { res: { ok: true } as Response, payload: { ok: true, post: toBlogPost(data) } };
}

export async function getBlogPostBySlug(slugOrId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .or(`slug.eq.${slugOrId},id.eq.${/^[0-9a-f-]{36}$/.test(slugOrId) ? slugOrId : "00000000-0000-0000-0000-000000000000"}`)
    .maybeSingle();
  if (error || !data) return { res: { ok: false } as Response, payload: { error: "Blog post not found" } };
  return { res: { ok: true } as Response, payload: { ok: true, post: toBlogPost(data) } };
}

// ===================== ADMIN: ORDERS / DRIVERS =====================

function toAdminOrder(o: any, farmerMap: Map<string, any>) {
  const farmer = farmerMap.get(o.farmer_id);
  return {
    _id: o.id,
    buyerId: o.profiles
      ? { _id: o.profiles.id, name: o.profiles.name, email: o.profiles.email, phone: o.profiles.phone }
      : null,
    farmerId: farmer ? { _id: farmer.id, farmName: farmer.farm_name, location: farmer.location, phone: farmer.phone } : null,
    driverId: o.drivers
      ? {
          _id: o.drivers.id,
          name: o.drivers.name,
          phone: o.drivers.phone,
          vehicleType: o.drivers.vehicle_type,
          currentLocation: o.drivers.current_location,
        }
      : null,
    items: (o.order_items || []).map((i: any) => ({
      productId: i.product_id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      unit: i.unit,
      image: i.image,
    })),
    subtotal: o.subtotal,
    deliveryFee: o.delivery_fee,
    serviceFee: o.service_fee,
    total: o.total,
    paymentMethod: o.payment_method,
    paymentReference: o.payment_reference,
    paymentStatus: o.payment_status,
    deliveryAddress: {
      label: o.delivery_label,
      street: o.delivery_street,
      city: o.delivery_city,
      state: o.delivery_state,
      phone: o.delivery_phone,
    },
    status: o.status,
    adminNotes: o.admin_notes,
    farmerNotes: o.farmer_notes,
    confirmedAt: o.confirmed_at,
    packedAt: o.packed_at,
    assignedAt: o.assigned_at,
    pickedUpAt: o.picked_up_at,
    deliveredAt: o.delivered_at,
    receiptConfirmedAt: o.receipt_confirmed_at,
    cancelledAt: o.cancelled_at,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    masterOrderId: o.master_order_id,
    subOrderIndex: o.sub_order_index,
    subOrderCount: o.sub_order_count,
    statusNotes: (o.order_status_notes || []).map((n: any) => ({
      status: n.status,
      note: n.note,
      createdAt: n.created_at,
    })),
  };
}

export async function getAdminOrders() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), profiles!buyer_id(id, name, email, phone), drivers!orders_driver_id_fkey(id, name, phone, vehicle_type, current_location)")
    .order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };

  const farmerMap = await attachFarmerProfiles(supabase, data || []);
  return { res: { ok: true } as Response, payload: { ok: true, orders: (data || []).map((o) => toAdminOrder(o, farmerMap)) } };
}

export async function getAdminOrderById(id: string) {
  const supabase = createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "*, order_items(*), order_status_notes(*), profiles!buyer_id(id, name, email, phone), drivers!orders_driver_id_fkey(id, name, phone, vehicle_type, current_location)",
    )
    .eq("id", id)
    .single();
  if (error || !order) return { res: { ok: false } as Response, payload: { error: error?.message || "Order not found" } };

  const farmerMap = await attachFarmerProfiles(supabase, [order]);
  const farmer = farmerMap.get((order as any).farmer_id);
  // Full farmer row is readable directly since admin has an RLS exception on farmers -- fetch
  // the phone number the public view doesn't expose.
  const { data: fullFarmer } = await supabase.from("farmers").select("phone").eq("id", (order as any).farmer_id).maybeSingle();

  const shaped = {
    ...toAdminOrder(order, farmerMap),
    farmerId: farmer ? { _id: farmer.id, farmName: farmer.farm_name, location: farmer.location, phone: fullFarmer?.phone } : null,
  };

  return { res: { ok: true } as Response, payload: { ok: true, order: shaped } };
}

// ===================== ADMIN: ESCROW =====================

export async function getAdminEscrows() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("escrows")
    .select("*, profiles!buyer_id(name), farmers(full_name)")
    .order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };

  const escrows = (data || []).map((e: any) => ({
    _id: e.id,
    orderId: e.order_id,
    amount: e.amount,
    status: e.status,
    buyerId: e.profiles ? { name: e.profiles.name } : null,
    farmerId: e.farmers ? { fullName: e.farmers.full_name } : null,
    createdAt: e.created_at,
    releasedAt: e.released_at,
  }));
  return { res: { ok: true } as Response, payload: { ok: true, escrows } };
}

export async function getAdminEscrowStats() {
  const supabase = createClient();
  const { data, error } = await supabase.from("escrows").select("amount, status");
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };

  const rows = data || [];
  const pending = rows.filter((r) => r.status === "pending");
  const released = rows.filter((r) => r.status === "released");
  const refunded = rows.filter((r) => r.status === "refunded");
  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      stats: {
        totalPending: pending.length,
        pendingAmount: pending.reduce((s, r) => s + Number(r.amount || 0), 0),
        releasedAmount: released.reduce((s, r) => s + Number(r.amount || 0), 0),
        totalRefunded: refunded.reduce((s, r) => s + Number(r.amount || 0), 0),
      },
    },
  };
}

export async function getAdminEscrowById(id: string) {
  const supabase = createClient();
  const { data: escrow, error } = await supabase
    .from("escrows")
    .select(
      "*, profiles!buyer_id(id, name, email, phone), farmers(id, full_name, farm_name, location, farm_address, phone, bank_name, account_holder_name, account_number, branch_code, bank_verified), released_by_profile:profiles!released_by(name, email), refunded_by_profile:profiles!refunded_by(name, email), orders(*, order_items(*))",
    )
    .eq("id", id)
    .single();
  if (error || !escrow) return { res: { ok: false } as Response, payload: { error: error?.message || "Escrow not found" } };

  const o = (escrow as any).orders;
  const shaped = {
    _id: (escrow as any).id,
    amount: (escrow as any).amount,
    status: (escrow as any).status,
    createdAt: (escrow as any).created_at,
    releasedAt: (escrow as any).released_at,
    refundedAt: (escrow as any).refunded_at,
    releaseNotes: (escrow as any).release_notes,
    refundReason: (escrow as any).refund_reason,
    releasedBy: (escrow as any).released_by_profile,
    refundedBy: (escrow as any).refunded_by_profile,
    buyerId: (escrow as any).profiles
      ? { name: (escrow as any).profiles.name, email: (escrow as any).profiles.email, phone: (escrow as any).profiles.phone }
      : null,
    farmerId: (escrow as any).farmers
      ? {
          fullName: (escrow as any).farmers.full_name,
          farmName: (escrow as any).farmers.farm_name,
          location: (escrow as any).farmers.location,
          farmAddress: (escrow as any).farmers.farm_address,
          phone: (escrow as any).farmers.phone,
          bankDetails: {
            bankName: (escrow as any).farmers.bank_name,
            accountHolderName: (escrow as any).farmers.account_holder_name,
            accountNumber: (escrow as any).farmers.account_number,
            branchCode: (escrow as any).farmers.branch_code,
            isVerified: (escrow as any).farmers.bank_verified,
          },
        }
      : null,
    orderId: o
      ? {
          _id: o.id,
          masterOrderId: o.master_order_id,
          status: o.status,
          items: (o.order_items || []).map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price, unit: i.unit })),
          subtotal: o.subtotal,
          deliveryFee: o.delivery_fee,
          serviceFee: o.service_fee,
          total: o.total,
          createdAt: o.created_at,
          paymentStatus: o.payment_status,
          escrowStatus: o.escrow_status,
          driverId: o.driver_id,
          deliveryAddress: {
            street: o.delivery_street,
            city: o.delivery_city,
            state: o.delivery_state,
          },
        }
      : null,
  };

  return { res: { ok: true } as Response, payload: { ok: true, escrow: shaped } };
}

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

// ===================== ADMIN: FARMER VERIFICATION =====================

function toAdminFarmerVerification(f: any) {
  return {
    _id: f.id,
    fullName: f.full_name,
    farmName: f.farm_name,
    location: f.location,
    farmAddress: f.farm_address,
    phone: f.phone,
    farmType: f.farm_type,
    status: f.status,
    bvn: f.bvn,
    bvnUrl: f.bvn_url,
    nin: f.nin,
    govIdUrl: f.gov_id_url,
    selfieUrl: f.selfie_url,
    farmerImageUrl: f.farmer_image_url,
    validIdImageUrl: f.valid_id_image_url,
    farmImageUrl: f.farm_image_url,
    farmImageUrls: f.farm_image_urls || [],
    rejectionReason: f.rejection_reason,
    createdAt: f.created_at,
    userId: f.profiles ? { name: f.profiles.name, email: f.profiles.email, phone: f.profiles.phone } : null,
  };
}

export async function getAdminFarmerVerifications() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("farmers")
    .select("*, profiles!user_id(name, email, phone)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  const list = await resolveFarmerKycUrls(supabase, (data || []).map(toAdminFarmerVerification));
  return { res: { ok: true } as Response, payload: { ok: true, list } };
}

export async function getAdminFarmerVerificationById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("farmers")
    .select("*, profiles!user_id(name, email, phone)")
    .eq("id", id)
    .single();
  if (error || !data) return { res: { ok: false } as Response, payload: { error: error?.message || "Farmer not found" } };
  const [farmer] = await resolveFarmerKycUrls(supabase, [toAdminFarmerVerification(data)]);
  return { res: { ok: true } as Response, payload: { ok: true, farmer } };
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
    coverImage: c.cover_image,
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

export async function getTutors() {
  const supabase = createClient();
  const { data, error } = await supabase.from("tutors").select("*").order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, tutors: (data || []).map(toTutor) } };
}

export async function getCourses({ audience, source }: { audience?: string; source?: string } = {}) {
  const supabase = createClient();
  let query = supabase.from("courses").select(COURSE_SELECT).eq("is_published", true).order("created_at", { ascending: false });
  if (source === "admin") query = query.eq("source", "admin");
  else if (source === "buyer") query = query.eq("source", "buyer").eq("status", "approved");
  else if (audience === "farmer") query = query.or("source.eq.admin,and(source.eq.buyer,status.eq.approved)");
  const { data, error } = await query;
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, courses: (data || []).map(toCourse) } };
}

export async function getCourseById(id: string, opts: { source?: string } = {}) {
  const supabase = createClient();
  let query = supabase.from("courses").select(COURSE_SELECT).eq("id", id).eq("is_published", true);
  if (opts.source === "buyer") query = query.eq("source", "buyer").eq("status", "approved");
  const { data, error } = await query.maybeSingle();
  if (error || !data) return { res: { ok: false } as Response, payload: { error: "Course not found" } };
  return { res: { ok: true } as Response, payload: { ok: true, course: toCourse(data) } };
}

export async function getBuyerBrowseCourses() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("source", "buyer")
    .eq("status", "approved")
    .eq("is_published", true)
    .neq("creator_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, courses: (data || []).map(toCourse) } };
}

export async function getMyCreatedCourses() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("source", "buyer")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, courses: (data || []).map(toCourse) } };
}

export async function getMySubscriptions(opts: { source?: string } = {}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  let query = supabase
    .from("subscriptions")
    .select(`*, courses(${COURSE_SELECT})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (opts.source === "buyer" || opts.source === "admin") query = query.eq("source", opts.source);

  const { data, error } = await query;
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  const subscriptions = (data || []).map((s: any) => ({
    _id: s.id,
    course: toCourse(s.courses),
    amount: s.amount,
    paidAt: s.paid_at,
  }));
  return { res: { ok: true } as Response, payload: { ok: true, subscriptions } };
}

export async function getCourseAccess(courseId: string, opts: { source?: string } = {}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  // Note: course_id alone already pins down a specific course (and therefore
  // its real source) -- deliberately not filtering by opts.source here too.
  // That URL-supplied hint can be wrong (e.g. a buyer-sourced course reached
  // through a listing that doesn't thread the param through), which used to
  // make a real, active subscription look unsubscribed right after payment.
  const { data, error } = await supabase
    .from("subscriptions")
    .select(`*, courses(${COURSE_SELECT})`)
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return { res: { ok: false } as Response, payload: { error: "Course is not subscribed" } };
  return {
    res: { ok: true } as Response,
    payload: { ok: true, course: toCourse(data.courses), subscription: { _id: data.id, amount: data.amount, paidAt: data.paid_at } },
  };
}

export async function getAdminBuyerCourses() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("source", "buyer")
    .order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, courses: (data || []).map(toCourse) } };
}

export async function getAdminCoursePurchases() {
  const supabase = createClient();
  // Deliberately not reusing COURSE_SELECT here -- it's shared with
  // buyer-facing course fetches, and this admin-only payout view needs the
  // creator's bank details, which must never ship through a public query.
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "*, courses(*, tutors(*), profiles!creator_id(id, name, email, bank_name, account_holder_name, account_number)), profiles!user_id(id, name, email)",
    )
    .eq("source", "buyer")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  const purchases = (data || []).map((p: any) => ({
    _id: p.id,
    course: {
      ...toCourse(p.courses),
      creator: p.courses?.profiles
        ? {
            _id: p.courses.profiles.id,
            name: p.courses.profiles.name,
            email: p.courses.profiles.email,
            bankName: p.courses.profiles.bank_name,
            accountHolderName: p.courses.profiles.account_holder_name,
            accountNumber: p.courses.profiles.account_number,
          }
        : undefined,
    },
    buyer: p.profiles ? { name: p.profiles.name, email: p.profiles.email } : undefined,
    amount: p.amount,
    creatorAmount: p.creator_amount,
    commission: p.commission,
    paymentReference: p.payment_reference,
    paidAt: p.paid_at,
    payoutStatus: p.payout_status,
    releasedAt: p.released_at,
  }));
  return { res: { ok: true } as Response, payload: { ok: true, purchases } };
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

export async function getConversations() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const [chatsRes, unreadRes] = await Promise.all([
    supabase
      .from("chats")
      .select(CHAT_SELECT)
      .or(`buyer_id.eq.${user.id},farmer_id.eq.${user.id}`)
      .order("updated_at", { ascending: false }),
    supabase.from("messages").select("chat_id").eq("receiver_id", user.id).eq("is_read", false),
  ]);
  if (chatsRes.error) return { res: { ok: false } as Response, payload: { error: chatsRes.error.message } };

  const unreadCounts = new Map<string, number>();
  for (const m of unreadRes.data || []) {
    unreadCounts.set(m.chat_id, (unreadCounts.get(m.chat_id) || 0) + 1);
  }

  const chats = (chatsRes.data || []).map((c: any) => ({ ...toChat(c), unreadCount: unreadCounts.get(c.id) || 0 }));
  return { res: { ok: true } as Response, payload: { ok: true, chats } };
}

export async function getChatDetails(chatId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("chats").select(CHAT_SELECT).eq("id", chatId).single();
  if (error || !data) return { res: { ok: false } as Response, payload: { error: error?.message || "Chat not found" } };
  return { res: { ok: true } as Response, payload: { ok: true, chat: toChat(data) } };
}

export async function getMessages(chatId: string, limit = 50, skip = 0) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*, sender:profiles!sender_id(id, name, email, role)")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .range(skip, skip + limit - 1);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, messages: (data || []).map(toMessage).reverse() } };
}

// Chat attachments live in a private bucket (only the two participants can
// read/write), so the stored path needs a short-lived signed URL rather
// than a public URL to actually render.
export async function getChatAttachmentUrl(path: string, expiresInSeconds = 3600) {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("chat-attachments").createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function getActiveDrivers() {
  const supabase = createClient();
  const { data, error } = await supabase.from("drivers").select("*").eq("status", "active").order("name");
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  const drivers = (data || []).map((d: any) => ({
    _id: d.id,
    name: d.name,
    phone: d.phone,
    vehicleType: d.vehicle_type,
    currentLocation: d.current_location,
    status: d.status,
    averageRating: d.average_rating,
  }));
  return { res: { ok: true } as Response, payload: { ok: true, drivers } };
}

export async function getAllDrivers() {
  const supabase = createClient();
  const { data, error } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, drivers: (data || []).map(toDriver) } };
}

export async function getDriverManagementStats() {
  const supabase = createClient();
  const [totalOrdersRes, deliveredOrdersRes] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["delivered", "receipt_confirmed"]),
  ]);
  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      stats: {
        totalOrders: totalOrdersRes.count || 0,
        deliveredOrders: deliveredOrdersRes.count || 0,
      },
    },
  };
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
    isActive: p.is_active,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

async function getOwnFarmer(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, farmer: null, userId: null };
  const { data: farmer } = await supabase.from("farmers").select("id").eq("user_id", user.id).single();
  if (!farmer) return { error: "Farmer record not found" as const, farmer: null, userId: user.id };
  return { error: null, farmer, userId: user.id };
}

export async function getFarmerProducts() {
  const supabase = createClient();
  const { error, farmer } = await getOwnFarmer(supabase);
  if (error || !farmer) return { res: { ok: false } as Response, payload: { error: error || "Farmer record not found" } };

  // Includes inactive products too -- the farmer needs to see them to
  // reactivate, unlike buyers who only ever see is_active = true rows
  // (enforced by products_select RLS regardless of this query).
  const { data, error: queryError } = await supabase
    .from("products")
    .select("*")
    .eq("farmer_id", farmer.id)
    .order("created_at", { ascending: false });
  if (queryError) return { res: { ok: false } as Response, payload: { error: queryError.message } };
  return { res: { ok: true } as Response, payload: { ok: true, products: (data || []).map(toFarmerProduct) } };
}

export async function getFarmerProductById(id: string) {
  const supabase = createClient();
  const { error, farmer } = await getOwnFarmer(supabase);
  if (error || !farmer) return { res: { ok: false } as Response, payload: { error: error || "Farmer record not found" } };

  const { data, error: queryError } = await supabase.from("products").select("*").eq("id", id).single();
  if (queryError || !data) return { res: { ok: false } as Response, payload: { error: "Product not found" } };
  if (data.farmer_id !== farmer.id) return { res: { ok: false } as Response, payload: { error: "Not authorized to view this product" } };
  return { res: { ok: true } as Response, payload: { ok: true, product: toFarmerProduct(data) } };
}

export async function getFarmerPayoutHistory() {
  const supabase = createClient();
  const { error, farmer, userId } = await getOwnFarmer(supabase);
  if (error || !farmer) return { res: { ok: false } as Response, payload: { error: error || "Farmer record not found" } };

  const [ledgerRes, profileRes] = await Promise.all([
    supabase
      .from("released_funds_ledger")
      .select("*, released_by_profile:profiles!released_by(name, email)")
      .eq("farmer_id", farmer.id)
      .order("released_at", { ascending: false }),
    supabase.from("profiles").select("account_balance").eq("id", userId).single(),
  ]);
  if (ledgerRes.error) return { res: { ok: false } as Response, payload: { error: ledgerRes.error.message } };

  const releasedFundsLedger = (ledgerRes.data || []).map((r: any) => ({
    orderId: r.order_id,
    escrowId: r.escrow_id,
    amount: r.amount,
    releasedAt: r.released_at,
    releasedBy: r.released_by_profile ? { name: r.released_by_profile.name, email: r.released_by_profile.email } : undefined,
    notes: r.notes,
  }));
  const totalReleased = releasedFundsLedger.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      accountBalance: profileRes.data?.account_balance || 0,
      releasedFundsLedger,
      totalReleased,
    },
  };
}

export async function getBuyerRefunds() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const [ledgerRes, profileRes] = await Promise.all([
    supabase.from("refund_ledger").select("*").eq("user_id", user.id).order("refunded_at", { ascending: false }),
    supabase.from("profiles").select("account_balance").eq("id", user.id).single(),
  ]);
  if (ledgerRes.error) return { res: { ok: false } as Response, payload: { error: ledgerRes.error.message } };

  const refundLedger = (ledgerRes.data || []).map((r: any) => ({
    orderId: r.order_id,
    escrowId: r.escrow_id,
    amount: r.amount,
    reason: r.reason,
    refundedAt: r.refunded_at,
  }));
  const totalRefunded = refundLedger.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      accountBalance: profileRes.data?.account_balance || 0,
      refundLedger,
      totalRefunded,
    },
  };
}

const FARMER_ACCEPTED_STATUSES = [
  "pending",
  "accepted_by_farmer",
  "confirmed",
  "packed",
  "assigned",
  "in_transit",
  "delivered",
  "receipt_confirmed",
  "completed",
];

export async function getFarmerPaymentHistory() {
  const supabase = createClient();
  const { error, farmer } = await getOwnFarmer(supabase);
  if (error || !farmer) return { res: { ok: false } as Response, payload: { error: error || "Farmer record not found" } };

  const { data, error: queryError } = await supabase
    .from("orders")
    .select("id, master_order_id, total, payment_status, escrow_status, accepted_at, created_at, order_items(id), buyer:profiles!buyer_id(name, email)")
    .eq("farmer_id", farmer.id)
    .in("status", FARMER_ACCEPTED_STATUSES)
    .order("created_at", { ascending: false });
  if (queryError) return { res: { ok: false } as Response, payload: { error: queryError.message } };

  const payments = (data || []).map((o: any) => ({
    _id: o.id,
    masterOrderId: o.master_order_id,
    total: o.total,
    paymentStatus: o.payment_status,
    escrowStatus: o.escrow_status,
    buyerName: o.buyer?.name,
    buyerEmail: o.buyer?.email,
    acceptedAt: o.accepted_at,
    createdAt: o.created_at,
    items: o.order_items || [],
  }));

  return { res: { ok: true } as Response, payload: { ok: true, payments } };
}

function toBankDetails(f: any) {
  return {
    bankName: f.bank_name || "",
    accountHolderName: f.account_holder_name || "",
    accountNumber: f.account_number || "",
    branchCode: f.branch_code || "",
    isVerified: f.bank_verified || false,
  };
}

export async function getFarmerBankDetails() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data, error } = await supabase
    .from("farmers")
    .select("bank_name, account_holder_name, account_number, branch_code, bank_verified")
    .eq("user_id", user.id)
    .single();
  if (error || !data) return { res: { ok: false } as Response, payload: { error: "Farmer record not found" } };
  return { res: { ok: true } as Response, payload: { ok: true, bankDetails: toBankDetails(data) } };
}

export async function getAdminAllProducts({ search }: { search?: string } = {}) {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("*, farmers(full_name, farm_name), profiles!user_id(name, email)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (search) query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };

  const { count } = await supabase.from("products").select("id", { count: "exact", head: true });

  const products = (data || []).map((p: any) => ({
    _id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    unit: p.unit,
    quantity: p.quantity,
    images: p.images || [],
    isActive: p.is_active,
    createdAt: p.created_at,
    farmerId: p.farmers ? { fullName: p.farmers.full_name, farmName: p.farmers.farm_name } : undefined,
    userId: p.profiles ? { name: p.profiles.name, email: p.profiles.email } : undefined,
  }));

  return { res: { ok: true } as Response, payload: { ok: true, products, total: count || products.length } };
}

function toAdminFarmerListItem(f: any) {
  return {
    _id: f.id,
    fullName: f.full_name,
    farmName: f.farm_name,
    phone: f.phone,
    status: f.status,
    createdAt: f.created_at,
    userId: f.profiles ? { email: f.profiles.email, phone: f.profiles.phone, status: f.profiles.status } : undefined,
  };
}

export async function getAdminFarmers({
  status,
  search,
  offset = 0,
  limit = 20,
}: { status?: string; search?: string; offset?: number; limit?: number } = {}) {
  const supabase = createClient();
  let query = supabase
    .from("farmers")
    .select("*, profiles!user_id(email, phone, status)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`full_name.ilike.%${search}%,farm_name.ilike.%${search}%,phone.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, farmers: (data || []).map(toAdminFarmerListItem), total: count || 0 } };
}

const FARMER_ACTIVE_ORDER_STATUSES_EXCLUDE = ["delivered", "receipt_confirmed", "completed", "cancelled", "rejected"];

export async function getAdminFarmerSuspensionEligibility(farmerId: string) {
  const supabase = createClient();
  const [ordersRes, escrowRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("farmer_id", farmerId)
      .not("status", "in", `(${FARMER_ACTIVE_ORDER_STATUSES_EXCLUDE.join(",")})`),
    supabase.from("escrows").select("id", { count: "exact", head: true }).eq("farmer_id", farmerId).eq("status", "pending"),
  ]);
  if (ordersRes.error) return { res: { ok: false } as Response, payload: { error: ordersRes.error.message } };
  if (escrowRes.error) return { res: { ok: false } as Response, payload: { error: escrowRes.error.message } };

  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      activeOrdersCount: ordersRes.count || 0,
      hasPendingEscrow: (escrowRes.count || 0) > 0,
    },
  };
}

function toAdminBuyer(p: any) {
  return {
    _id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    role: p.role,
    status: p.status,
    createdAt: p.created_at,
    profileImage: p.profile_image,
    suspensionReason: p.suspension_reason,
    suspendedAt: p.suspended_at,
  };
}

export async function getAdminBuyers({
  status,
  search,
  offset = 0,
  limit = 20,
}: { status?: string; search?: string; offset?: number; limit?: number } = {}) {
  const supabase = createClient();
  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, users: (data || []).map(toAdminBuyer), total: count || 0 } };
}

export async function getAdminBuyerById(userId: string) {
  const supabase = createClient();
  const [profileRes, ordersRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).eq("role", "user").single(),
    supabase
      .from("orders")
      .select("id, status, payment_status, total, created_at, farmers(farm_name)")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (profileRes.error || !profileRes.data) {
    return { res: { ok: false } as Response, payload: { error: profileRes.error?.message || "Buyer not found" } };
  }
  if (ordersRes.error) return { res: { ok: false } as Response, payload: { error: ordersRes.error.message } };

  const orders = (ordersRes.data || []).map((o: any) => ({
    _id: o.id,
    status: o.status,
    paymentStatus: o.payment_status,
    total: o.total,
    createdAt: o.created_at,
    farmName: o.farmers?.farm_name || null,
  }));

  return {
    res: { ok: true } as Response,
    payload: { ok: true, buyer: toAdminBuyer(profileRes.data), orders },
  };
}

export async function getAdminBuyerStats() {
  const supabase = createClient();
  const [totalRes, activeRes, suspendedRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user").eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user").eq("status", "suspended"),
  ]);
  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      totalBuyers: totalRes.count || 0,
      activeBuyers: activeRes.count || 0,
      suspendedBuyers: suspendedRes.count || 0,
    },
  };
}

export async function getAdminBuyerSuspensionEligibility(userId: string) {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", userId)
    .not("status", "in", `(${FARMER_ACTIVE_ORDER_STATUSES_EXCLUDE.join(",")})`);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };
  return { res: { ok: true } as Response, payload: { ok: true, activeOrdersCount: count || 0 } };
}

export async function getAdminRefunds({ status }: { status?: string } = {}) {
  const supabase = createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, master_order_id, total, payment_status, escrow_status, status, cancelled_at, updated_at, cancellation_reason, order_items(id, name, quantity, price), buyer:profiles!buyer_id(name, email), farmers(full_name, farm_name)",
    )
    .eq("status", "cancelled")
    // Orders cancelled before ever being paid have nothing to refund --
    // exclude them so they don't inflate the refund queue with a
    // misleading "Processing" badge.
    .neq("payment_status", "pending")
    .order("cancelled_at", { ascending: false })
    .limit(50);
  if (status && status !== "all") query = query.eq("payment_status", status);

  const { data, error } = await query;
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };

  const refunds = (data || []).map((o: any) => ({
    _id: o.id,
    masterOrderId: o.master_order_id,
    buyerId: o.buyer ? { name: o.buyer.name, email: o.buyer.email } : undefined,
    farmerId: o.farmers ? { fullName: o.farmers.full_name, farmName: o.farmers.farm_name } : undefined,
    total: o.total,
    items: o.order_items || [],
    cancelledAt: o.cancelled_at || o.updated_at,
    cancellationReason: o.cancellation_reason,
    paymentStatus: o.payment_status,
    escrowStatus: o.escrow_status,
    status: o.status,
  }));

  return { res: { ok: true } as Response, payload: { ok: true, refunds, total: refunds.length } };
}

export async function getAdminReviews({ limit = 100 }: { limit?: number } = {}) {
  const supabase = createClient();
  const { data, error, count } = await supabase
    .from("reviews")
    .select("*, products(id, name, images), buyer:profiles!buyer_id(id, name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };

  const reviews = (data || []).map((r: any) => ({
    _id: r.id,
    rating: r.rating,
    comment: r.comment,
    buyerName: r.buyer_name,
    createdAt: r.created_at,
    productId: r.products ? { _id: r.products.id, name: r.products.name, images: r.products.images || [] } : undefined,
    buyerId: r.buyer ? { _id: r.buyer.id, name: r.buyer.name, email: r.buyer.email } : undefined,
  }));

  return { res: { ok: true } as Response, payload: { ok: true, reviews, total: count || reviews.length } };
}

// Platform-wide activity feed for the admin notification bell/page -- same
// derive-from-existing-tables approach as getBuyerRecentActivity, no
// dedicated notifications table.
export async function getAdminRecentActivity() {
  const supabase = createClient();

  const [ordersRes, farmersRes, buyersRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, updated_at, total")
      .order("updated_at", { ascending: false })
      .limit(15),
    supabase
      .from("farmers")
      .select("id, farm_name, created_at, profiles!user_id(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("profiles")
      .select("id, name, created_at")
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (ordersRes.error) return { res: { ok: false } as Response, payload: { error: ordersRes.error.message } };
  if (farmersRes.error) return { res: { ok: false } as Response, payload: { error: farmersRes.error.message } };
  if (buyersRes.error) return { res: { ok: false } as Response, payload: { error: buyersRes.error.message } };

  const orderEvents = (ordersRes.data || []).map((o) => ({
    id: `order-${o.id}`,
    type: "order" as const,
    message: `Order #${o.id.slice(0, 8)} is now "${o.status}"`,
    amount: o.total,
    createdAt: o.updated_at,
    link: `/admin/order-control`,
  }));

  const farmerEvents = (farmersRes.data || []).map((f: any) => ({
    id: `farmer-${f.id}`,
    type: "farmer" as const,
    message: `New farmer verification request: ${f.farm_name || f.profiles?.name || "Unnamed farm"}`,
    amount: null,
    createdAt: f.created_at,
    link: `/admin/verify-farmers/${f.id}`,
  }));

  const buyerEvents = (buyersRes.data || []).map((b) => ({
    id: `buyer-${b.id}`,
    type: "buyer" as const,
    message: `New buyer signed up: ${b.name || "Unnamed"}`,
    amount: null,
    createdAt: b.created_at,
    link: `/admin/buyers`,
  }));

  const items = [...orderEvents, ...farmerEvents, ...buyerEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return { res: { ok: true } as Response, payload: { ok: true, items } };
}

export async function getMyFullProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profileError || !profile) return { res: { ok: false } as Response, payload: { error: "Profile not found" } };

  const isFarmer = profile.role === "farmer";
  let farmer: any = null;
  if (isFarmer) {
    const { data } = await supabase.from("farmers").select("farm_name, farm_type, location, status").eq("user_id", user.id).single();
    farmer = data;
  }

  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      isFarmer,
      profile: {
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        country: profile.country || "",
        profileImage: profile.profile_image || "",
        farmName: farmer?.farm_name || "",
        farmType: farmer?.farm_type || "",
        location: farmer?.location || "",
        isVerified: farmer?.status === "approved",
      },
    },
  };
}

export async function getWishlist() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const { data: rows, error } = await supabase
    .from("wishlists")
    .select("id, product_id, created_at")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return { res: { ok: false } as Response, payload: { error: error.message } };

  const productIds = (rows || []).map((r) => r.product_id);
  if (productIds.length === 0) {
    return { res: { ok: true } as Response, payload: { ok: true, items: [] } };
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds);
  if (productsError) return { res: { ok: false } as Response, payload: { error: productsError.message } };

  const farmerMap = await attachFarmerProfiles(supabase, (products || []) as { farmer_id: string }[]);
  const productMap = new Map((products || []).map((p) => [p.id, toProduct(p, farmerMap)]));

  const items = (rows || [])
    .map((r) => {
      const product = productMap.get(r.product_id);
      if (!product) return null;
      return { wishlistId: r.id, addedAt: r.created_at, product };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return { res: { ok: true } as Response, payload: { ok: true, items } };
}

// Lightweight "recent activity" feed derived from existing tables -- no
// dedicated notifications table/triggers, just a read of things that
// already changed recently for this buyer (order status, refunds, unread
// chat messages).
export async function getBuyerRecentActivity() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const [ordersRes, refundsRes, chatsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, updated_at, total")
      .eq("buyer_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(15),
    supabase
      .from("refund_ledger")
      .select("id, amount, reason, refunded_at")
      .eq("user_id", user.id)
      .order("refunded_at", { ascending: false })
      .limit(10),
    supabase
      .from("chats")
      .select("id, updated_at, farmer_id")
      .eq("buyer_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);
  if (ordersRes.error) return { res: { ok: false } as Response, payload: { error: ordersRes.error.message } };
  if (refundsRes.error) return { res: { ok: false } as Response, payload: { error: refundsRes.error.message } };
  if (chatsRes.error) return { res: { ok: false } as Response, payload: { error: chatsRes.error.message } };

  const orderEvents = (ordersRes.data || []).map((o) => ({
    id: `order-${o.id}`,
    type: "order" as const,
    message: `Order #${o.id.slice(0, 8)} is now "${o.status}"`,
    amount: o.total,
    createdAt: o.updated_at,
    link: `/buyer/orders`,
  }));

  const refundEvents = (refundsRes.data || []).map((r) => ({
    id: `refund-${r.id}`,
    type: "refund" as const,
    message: r.reason ? `Refund issued: ${r.reason}` : "Refund issued",
    amount: r.amount,
    createdAt: r.refunded_at,
    link: `/buyer/refunds`,
  }));

  const chatEvents = (chatsRes.data || []).map((c) => ({
    id: `chat-${c.id}`,
    type: "chat" as const,
    message: "New activity in one of your chats",
    amount: null,
    createdAt: c.updated_at,
    link: `/buyer/chat/${c.id}`,
  }));

  const items = [...orderEvents, ...refundEvents, ...chatEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return { res: { ok: true } as Response, payload: { ok: true, items } };
}

// ===================== REFERRALS =====================

export async function getMyReferrals() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: { ok: false } as Response, payload: { error: "Not authenticated" } };

  const [profileRes, settingsRes, referralsRes, rewardsRes] = await Promise.all([
    supabase.from("profiles").select("referral_code").eq("id", user.id).single(),
    supabase.from("referral_settings").select("reward_amount, min_referrals_for_payout").eq("id", true).single(),
    supabase
      .from("referrals")
      .select("id, referred_id, first_purchase_rewarded, created_at, profiles!referred_id(name, email)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("referral_rewards")
      .select("id, reward_type, amount, status, created_at, released_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  if (referralsRes.error) return { res: { ok: false } as Response, payload: { error: referralsRes.error.message } };
  if (rewardsRes.error) return { res: { ok: false } as Response, payload: { error: rewardsRes.error.message } };

  const referrals = (referralsRes.data || []).map((r: any) => ({
    id: r.id,
    referredName: r.profiles?.name || "Unknown",
    referredEmail: r.profiles?.email || null,
    hasPurchased: r.first_purchase_rewarded,
    createdAt: r.created_at,
  }));

  const rewards = (rewardsRes.data || []).map((r: any) => ({
    id: r.id,
    type: r.reward_type,
    amount: Number(r.amount || 0),
    status: r.status,
    createdAt: r.created_at,
    releasedAt: r.released_at,
  }));

  const pendingAmount = rewards.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const releasedAmount = rewards.filter((r) => r.status === "released").reduce((s, r) => s + r.amount, 0);
  const referralCount = referrals.length;
  const minReferrals = settingsRes.data?.min_referrals_for_payout ?? 0;

  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      referralCode: profileRes.data?.referral_code || null,
      rewardAmount: Number(settingsRes.data?.reward_amount || 0),
      minReferralsForPayout: minReferrals,
      referralCount,
      eligibleForPayout: referralCount >= minReferrals,
      referrals,
      rewards,
      pendingAmount,
      releasedAmount,
    },
  };
}

export async function getAdminReferrals() {
  const supabase = createClient();

  const [settingsRes, referralsRes, rewardsRes] = await Promise.all([
    supabase.from("referral_settings").select("reward_amount, min_referrals_for_payout").eq("id", true).single(),
    supabase
      .from("referrals")
      .select("id, referrer_id, first_purchase_rewarded, created_at, profiles!referrer_id(name, email, bank_name, account_holder_name, account_number)"),
    supabase.from("referral_rewards").select("referrer_id, amount, status"),
  ]);
  if (referralsRes.error) return { res: { ok: false } as Response, payload: { error: referralsRes.error.message } };
  if (rewardsRes.error) return { res: { ok: false } as Response, payload: { error: rewardsRes.error.message } };

  const minReferrals = settingsRes.data?.min_referrals_for_payout ?? 0;

  const byReferrer = new Map<string, any>();
  for (const r of referralsRes.data || []) {
    const referrer = (r as any).profiles;
    const entry = byReferrer.get(r.referrer_id) || {
      referrerId: r.referrer_id,
      name: referrer?.name || "Unknown",
      email: referrer?.email || null,
      bankName: referrer?.bank_name || null,
      accountHolderName: referrer?.account_holder_name || null,
      accountNumber: referrer?.account_number || null,
      referralCount: 0,
      purchaseCount: 0,
      pendingAmount: 0,
      releasedAmount: 0,
    };
    entry.referralCount += 1;
    if (r.first_purchase_rewarded) entry.purchaseCount += 1;
    byReferrer.set(r.referrer_id, entry);
  }
  for (const rw of rewardsRes.data || []) {
    const entry = byReferrer.get(rw.referrer_id);
    if (!entry) continue;
    if (rw.status === "pending") entry.pendingAmount += Number(rw.amount || 0);
    else entry.releasedAmount += Number(rw.amount || 0);
  }

  const referrers = Array.from(byReferrer.values())
    .map((e) => ({ ...e, eligibleForPayout: e.referralCount >= minReferrals }))
    .sort((a, b) => b.pendingAmount - a.pendingAmount);

  return {
    res: { ok: true } as Response,
    payload: {
      ok: true,
      rewardAmount: Number(settingsRes.data?.reward_amount || 0),
      minReferralsForPayout: minReferrals,
      referrers,
    },
  };
}
