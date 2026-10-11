// Human-readable order statuses. Screens must never show the raw database
// codes (e.g. "awaiting_payment") to users.

const BUYER_LABEL: Record<string, string> = {
  awaiting_transport_quote: 'Calculating transport fare',
  awaiting_payment: 'Ready to pay',
  pending: 'Paid · waiting for farmer',
  accepted_by_farmer: 'Accepted by farmer',
  confirmed: 'Confirmed',
  packed: 'Packed',
  assigned: 'Driver assigned',
  in_transit: 'On the way',
  delivered: 'Delivered',
  receipt_confirmed: 'Completed',
  completed: 'Completed',
  rejected: 'Not accepted',
  cancelled: 'Cancelled',
};

const FARMER_LABEL: Record<string, string> = {
  pending: 'New · accept or reject',
  accepted_by_farmer: 'Accepted',
  confirmed: 'Confirmed by admin',
  packed: 'Packed',
  assigned: 'Driver assigned',
  in_transit: 'In transit',
  delivered: 'Delivered',
  receipt_confirmed: 'Completed',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

function humanize(status: string) {
  const s = status.replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function orderStatusLabel(status: string | null | undefined, perspective: 'buyer' | 'farmer' = 'buyer') {
  if (!status) return '';
  const key = status.toLowerCase();
  return (perspective === 'farmer' ? FARMER_LABEL : BUYER_LABEL)[key] ?? humanize(key);
}

const FARMER_APPLICATION_LABEL: Record<string, string> = {
  draft: 'Farmer application: finish your verification',
  pending: 'Farmer application: under review',
  rejected: 'Farmer application: needs changes',
};

export function farmerApplicationLabel(status: string | null | undefined) {
  if (!status) return '';
  return FARMER_APPLICATION_LABEL[status] ?? `Farmer application: ${humanize(status).toLowerCase()}`;
}
