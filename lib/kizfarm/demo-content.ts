/**
 * Temporary showcase content for the public marketing site.
 * Delete this file (and its imports in home-page.tsx, blog-page.tsx,
 * and blog-detail.tsx) once real farmers/products/posts are onboarded.
 */

export interface DemoProduct {
  _id: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  category?: string;
  images?: string[];
  farmerId?: { farmName?: string; location?: string };
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    _id: "demo-1",
    name: "Golden Sweet Pineapples",
    description: "Hand-picked, tropical-sweet pineapples bursting with juice.",
    price: 8500,
    unit: "per basket",
    category: "Fruits",
    images: ["https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=800&q=80"],
    farmerId: { farmName: "Sunrise Orchards", location: "Ogun" },
  },
  {
    _id: "demo-2",
    name: "Farm-Fresh Free-Range Eggs",
    description: "Rich, golden-yolked eggs from pasture-raised hens.",
    price: 3200,
    unit: "per crate",
    category: "Dairy & Eggs",
    images: ["https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=800&q=80"],
    farmerId: { farmName: "Greenfield Poultry", location: "Oyo" },
  },
  {
    _id: "demo-3",
    name: "Organic Baby Spinach",
    description: "Tender, nutrient-packed spinach harvested at peak freshness.",
    price: 2800,
    unit: "per bunch",
    category: "Vegetables",
    images: ["https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&q=80"],
    farmerId: { farmName: "Verdant Fields", location: "Plateau" },
  },
  {
    _id: "demo-4",
    name: "Premium Long-Grain Rice",
    description: "Locally grown, stone-free long-grain rice, aged for flavor.",
    price: 42000,
    unit: "per 50kg bag",
    category: "Grains",
    images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80"],
    farmerId: { farmName: "Kebbi Grain Cooperative", location: "Kebbi" },
  },
  {
    _id: "demo-5",
    name: "Sun-Ripened Bell Peppers",
    description: "A vibrant mix of red, yellow, orange and green peppers.",
    price: 4500,
    unit: "per basket",
    category: "Vegetables",
    images: ["https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&q=80"],
    farmerId: { farmName: "Tropical Harvest Farms", location: "Cross River" },
  },
];

export interface DemoCourse {
  _id: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  rating: number;
  lessons: number;
  students: number;
  tutor: { name: string; credential: string; avatar: string };
}

export const DEMO_COURSES: DemoCourse[] = [
  {
    _id: "demo-course-1",
    title: "Modern Crop Rotation for Higher Yields",
    description:
      "Learn how to sequence crops across seasons to protect soil health and boost output year over year.",
    price: 25000,
    thumbnail: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80",
    rating: 4.9,
    lessons: 18,
    students: 642,
    tutor: {
      name: "Dr. Amina Bello",
      credential: "Certified Agronomist · 15+ Years",
      avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&q=80",
    },
  },
  {
    _id: "demo-course-2",
    title: "Poultry Farming from Scratch",
    description:
      "A complete beginner-to-profit roadmap for raising healthy, high-yield poultry on any budget.",
    price: 18000,
    thumbnail: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&q=80",
    rating: 4.8,
    lessons: 14,
    students: 823,
    tutor: {
      name: "Chief Emeka Obi",
      credential: "Master Poultry Farmer · 20+ Years",
      avatar: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200&q=80",
    },
  },
  {
    _id: "demo-course-3",
    title: "Organic Vegetable Farming for Beginners",
    description:
      "Build a chemical-free vegetable garden that produces consistently — from bed prep to harvest.",
    price: 15000,
    thumbnail: "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=800&q=80",
    rating: 4.9,
    lessons: 12,
    students: 511,
    tutor: {
      name: "Ngozi Adeyemi",
      credential: "Organic Farming Consultant",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80",
    },
  },
  {
    _id: "demo-course-4",
    title: "Smart Irrigation & Water Management",
    description:
      "Cut water waste and protect yields through dry spells with practical, low-cost irrigation systems.",
    price: 22000,
    thumbnail: "/course-thumbs/irrigation.jpg",
    rating: 4.7,
    lessons: 16,
    students: 389,
    tutor: {
      name: "Engr. Tunde Bakare",
      credential: "Agricultural Engineer",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    },
  },
  {
    _id: "demo-course-5",
    title: "Livestock & Cattle Rearing Essentials",
    description:
      "Everything from breed selection to feeding schedules and disease prevention for a healthy herd.",
    price: 20000,
    thumbnail: "https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=800&q=80",
    rating: 4.8,
    lessons: 15,
    students: 458,
    tutor: {
      name: "Alhaji Musa Ibrahim",
      credential: "Livestock Specialist · 18+ Years",
      avatar: "https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?w=200&q=80",
    },
  },
];

export interface DemoBlogPost {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImage: string;
  category: string;
  readTime: number;
  author: string;
  createdAt: string;
}

const blocks = (
  items: Array<{ type: "heading" | "paragraph"; value: string; level?: number }>,
) => JSON.stringify(items);

export const DEMO_BLOG_POSTS: DemoBlogPost[] = [
  {
    _id: "demo-blog-1",
    title: "5 Signs Your Soil Needs More Than Water",
    slug: "signs-your-soil-needs-more-than-water",
    summary:
      "Healthy soil is the foundation of every great harvest. Here's how our partner agronomists spot trouble before it shows up in the crop.",
    coverImage: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80",
    category: "Agronomy",
    readTime: 4,
    author: "KizFarm Agronomy Team",
    createdAt: "2026-07-02T08:00:00.000Z",
    content: blocks([
      { type: "paragraph", value: "Water keeps plants alive, but it can't fix what's actually wrong underground. Our field agronomists walk partner farms every season, and the same five warning signs come up again and again — long before yields start to drop." },
      { type: "heading", value: "1. Crusting after rain", level: 2 },
      { type: "paragraph", value: "If the surface hardens into a crust within a day of rainfall, organic matter is too low and water is running off instead of soaking in." },
      { type: "heading", value: "2. Pale, uneven leaf colour", level: 2 },
      { type: "paragraph", value: "Blotchy yellowing that doesn't match a known pest or disease usually points to a nutrient imbalance rather than a watering problem." },
      { type: "heading", value: "3. Compaction you can feel", level: 2 },
      { type: "paragraph", value: "Push a rod into the ground after rain. If it stops hard within the top 15cm, roots are hitting the same wall — and so is your yield." },
      { type: "heading", value: "4. Standing water that lingers", level: 2 },
      { type: "paragraph", value: "Puddles that take more than a few hours to drain are a sign of poor structure, not just heavy rain." },
      { type: "heading", value: "5. Weeds that thrive where crops struggle", level: 2 },
      { type: "paragraph", value: "Certain weeds are indicator species — their spread often tells you more about pH and drainage than a soil kit will." },
      { type: "paragraph", value: "Every KizFarm partner farm gets a seasonal soil health check as part of onboarding, because a good harvest starts well below the surface." },
    ]),
  },
  {
    _id: "demo-blog-2",
    title: "From Seed to Shelf: How KizFarm's Cold Chain Keeps Produce Fresh",
    slug: "seed-to-shelf-cold-chain",
    summary:
      "A tomato picked at 6am can be on your table by evening — here's the logistics that make same-day freshness possible.",
    coverImage: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&q=80",
    category: "Logistics",
    readTime: 5,
    author: "KizFarm Ops Team",
    createdAt: "2026-07-10T08:00:00.000Z",
    content: blocks([
      { type: "paragraph", value: "\"Farm to table\" gets used a lot, but the distance between the two is where most produce actually loses its quality. At KizFarm, closing that gap is a logistics problem we treat as seriously as the farming itself." },
      { type: "heading", value: "Harvest windows, not harvest days", level: 2 },
      { type: "paragraph", value: "Partner farms harvest against a delivery schedule, not a calendar date. Produce is picked in the cool early morning hours and moved within minutes, not hours." },
      { type: "heading", value: "Temperature-controlled from the first mile", level: 2 },
      { type: "paragraph", value: "Every crate moves through a chilled staging point before it ever reaches a delivery vehicle, which is the single biggest factor in extending shelf life." },
      { type: "heading", value: "Route density over route speed", level: 2 },
      { type: "paragraph", value: "Instead of rushing one order at a time, our delivery routes are built around tight geographic clusters — fewer stops between the farm and your door means less time in transit." },
      { type: "paragraph", value: "The result: produce that's still cold, still crisp, and often still smells like the field it came from." },
    ]),
  },
  {
    _id: "demo-blog-3",
    title: "Meet the Farmers: A Day in the Life on a KizFarm Partner Farm",
    slug: "meet-the-farmers-a-day-in-the-life",
    summary:
      "Before sunrise until well after dusk — a look at what a harvest day actually looks like for the people behind your produce.",
    coverImage: "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=1200&q=80",
    category: "Community",
    readTime: 4,
    author: "KizFarm Editorial",
    createdAt: "2026-07-16T08:00:00.000Z",
    content: blocks([
      { type: "paragraph", value: "Long before the delivery app shows \"out for delivery,\" a partner farm has already put in hours of work. We spent a morning on one of them to see what harvest day really looks like." },
      { type: "heading", value: "5:30am — First light, first pick", level: 2 },
      { type: "paragraph", value: "Picking starts as soon as there's enough light to work by. Produce harvested in the cool morning air holds its quality far longer than anything picked under a midday sun." },
      { type: "heading", value: "8:00am — Sorting and grading", level: 2 },
      { type: "paragraph", value: "Every crate is hand-sorted on-site. What doesn't meet KizFarm's freshness grade doesn't leave the farm — it's that simple." },
      { type: "heading", value: "10:30am — Handoff to logistics", level: 2 },
      { type: "paragraph", value: "Graded produce is logged, weighed, and moved into the cold chain, already tagged for the buyers waiting on the other end." },
      { type: "paragraph", value: "It's a demanding routine, but it's also the reason KizFarm can promise same-day freshness — because someone was already out in the field before the rest of us woke up." },
    ]),
  },
  {
    _id: "demo-blog-4",
    title: "Why Direct-to-Buyer Selling Is a Game-Changer for Smallholder Farmers",
    slug: "direct-to-buyer-selling-game-changer",
    summary:
      "Cutting out unnecessary middlemen doesn't just mean fresher produce for buyers — it means fairer pay for the people growing it.",
    coverImage: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&q=80",
    category: "Market Insights",
    readTime: 3,
    author: "KizFarm Market Insights",
    createdAt: "2026-07-22T08:00:00.000Z",
    content: blocks([
      { type: "paragraph", value: "In a traditional supply chain, produce can pass through three or four intermediaries before it reaches a buyer — and the farmer's share shrinks a little at every stop." },
      { type: "heading", value: "The traditional markup problem", level: 2 },
      { type: "paragraph", value: "By the time produce reaches a retail shelf, a farmer may see less than half of what the end buyer actually paid. None of those extra margins go toward better seed, better tools, or better land." },
      { type: "heading", value: "What changes with a direct model", level: 2 },
      { type: "paragraph", value: "When farmers list and price their own harvest, more of the final sale goes straight back to the farm — funding the next planting season instead of a chain of resellers." },
      { type: "paragraph", value: "It's a simple shift with a compounding effect: fairer pricing today builds toward stronger, more resilient farms tomorrow." },
    ]),
  },
  {
    _id: "demo-blog-5",
    title: "Seasonal Eating Guide: What's Fresh This Month",
    slug: "seasonal-eating-guide-whats-fresh",
    summary:
      "Eating with the season means better flavour, better prices, and produce that traveled the shortest possible distance to reach you.",
    coverImage: "https://images.unsplash.com/photo-1467453678174-768ec283a940?w=1200&q=80",
    category: "Nutrition",
    readTime: 3,
    author: "KizFarm Nutrition Desk",
    createdAt: "2026-07-29T08:00:00.000Z",
    content: blocks([
      { type: "paragraph", value: "Produce grown in season doesn't just taste better — it's usually cheaper, more nutrient-dense, and needs far less energy to get from farm to plate." },
      { type: "heading", value: "Why seasonality matters", level: 2 },
      { type: "paragraph", value: "Crops grown in their natural window ripen fully on the plant instead of in transit, which is where most of their flavour and nutrition actually comes from." },
      { type: "heading", value: "Building a seasonal plate", level: 2 },
      { type: "paragraph", value: "A simple rule: if it's abundant and affordable in the marketplace right now, it's probably in season — and it's the produce worth building your week around." },
      { type: "paragraph", value: "Check the KizFarm marketplace regularly; featured harvests shift as different partner farms come into season across the country." },
    ]),
  },
];
