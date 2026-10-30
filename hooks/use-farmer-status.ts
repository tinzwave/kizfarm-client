"use client";

import { useEffect, useState } from "react";
import { getFarmerStatus } from "@/lib/kizfarm/supabase-data";

export type FarmerStatusSummary = {
  _id: string;
  status: "draft" | "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  submittedAt?: string | null;
  missingCount: number;
};

// The signed-in user's farmer application, if any. The buyer sidebar and
// dashboard both need it on the same page load, so concurrent callers
// share one request; it's refetched on the next mount after that settles.
let inflight: Promise<FarmerStatusSummary | null> | null = null;

function fetchFarmerStatus() {
  if (!inflight) {
    inflight = getFarmerStatus()
      .then(({ res, payload }) => (res.ok ? ((payload?.farmer as FarmerStatusSummary | null) ?? null) : null))
      .catch(() => null)
      .finally(() => {
        setTimeout(() => {
          inflight = null;
        }, 0);
      });
  }
  return inflight;
}

export function useFarmerStatus() {
  const [farmer, setFarmer] = useState<FarmerStatusSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchFarmerStatus().then((f) => {
      if (cancelled) return;
      setFarmer(f);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { farmer, loaded };
}
