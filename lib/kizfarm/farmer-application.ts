// One definition of "a complete farmer application", shared by the
// applicant's pages, the buyer dashboard and the admin screens.
//
// The database enforces the same rules in public.farmer_application_missing
// (migration 0047) -- submit_farmer_verification refuses anything this
// list would flag. Keep the two in step.

export type FarmerApplicationStatus = "draft" | "pending" | "approved" | "rejected";

export const FARM_IMAGE_COUNT = 5;

export type ApplicationStepKey =
  | "farm_name"
  | "phone"
  | "location"
  | "farm_type"
  | "farm_address"
  | "farmer_image"
  | "valid_id_image"
  | "farm_images";

export type ApplicationFields = {
  farmName?: string | null;
  phone?: string | null;
  location?: string | null;
  farmType?: string | null;
  farmAddress?: string | null;
  farmerImageUrl?: string | null;
  selfieUrl?: string | null;
  validIdImageUrl?: string | null;
  govIdUrl?: string | null;
  farmImageUrls?: (string | null)[] | null;
};

export type ApplicationStep = {
  key: ApplicationStepKey;
  label: string;
  hint: string;
  done: boolean;
  group: "details" | "documents";
};

const filled = (v?: string | null) => !!v && v.trim() !== "";

export function farmImagesUploaded(f: ApplicationFields) {
  return (f.farmImageUrls || []).filter((p) => filled(p)).length;
}

export function applicationChecklist(f: ApplicationFields): ApplicationStep[] {
  const images = farmImagesUploaded(f);
  return [
    { key: "farm_name", group: "details", label: "Farm name", hint: "The name buyers will see", done: filled(f.farmName) },
    { key: "phone", group: "details", label: "Phone number", hint: "Digits only", done: filled(f.phone) },
    { key: "location", group: "details", label: "Farm state", hint: "Where the farm is", done: filled(f.location) },
    { key: "farm_type", group: "details", label: "Farm type", hint: "Crops, livestock or mixed", done: filled(f.farmType) },
    { key: "farm_address", group: "details", label: "Farm address", hint: "Full physical address", done: filled(f.farmAddress) },
    {
      key: "farmer_image",
      group: "documents",
      label: "Your photo",
      hint: "A clear photo of your face",
      done: filled(f.farmerImageUrl) || filled(f.selfieUrl),
    },
    {
      key: "valid_id_image",
      group: "documents",
      label: "Valid ID",
      hint: "Driver's licence, voter's card, NIN slip or passport",
      done: filled(f.validIdImageUrl) || filled(f.govIdUrl),
    },
    {
      key: "farm_images",
      group: "documents",
      label: `${FARM_IMAGE_COUNT} farm photos`,
      hint: images >= FARM_IMAGE_COUNT ? "All uploaded" : `${images} of ${FARM_IMAGE_COUNT} uploaded`,
      done: images >= FARM_IMAGE_COUNT,
    },
  ];
}

export function missingSteps(f: ApplicationFields) {
  return applicationChecklist(f).filter((s) => !s.done);
}

export function completionPercent(f: ApplicationFields) {
  const steps = applicationChecklist(f);
  return Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
}

type StatusMeta = {
  label: string;
  adminLabel: string;
  badge: string;
  dot: string;
  icon: string;
};

export const APPLICATION_STATUS: Record<FarmerApplicationStatus, StatusMeta> = {
  draft: {
    label: "Incomplete",
    adminLabel: "Incomplete",
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
    icon: "edit_note",
  },
  pending: {
    label: "Under review",
    adminLabel: "Pending review",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
    icon: "hourglass_top",
  },
  approved: {
    label: "Verified",
    adminLabel: "Verified",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-600",
    icon: "verified",
  },
  rejected: {
    label: "Needs changes",
    adminLabel: "Rejected",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-600",
    icon: "error",
  },
};

export function statusMeta(status?: string | null): StatusMeta {
  return APPLICATION_STATUS[(status as FarmerApplicationStatus) || "draft"] ?? APPLICATION_STATUS.draft;
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const NIGERIAN_STATES = [
  "Abia", "Abuja (FCT)", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna",
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

export const FARM_TYPES = [
  { value: "crops", label: "Crops" },
  { value: "livestock", label: "Livestock" },
  { value: "mixed", label: "Mixed farming" },
];

export function farmTypeLabel(value?: string | null) {
  return FARM_TYPES.find((t) => t.value === value)?.label || value || "—";
}
