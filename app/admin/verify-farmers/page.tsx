import { Suspense } from "react";
import FarmerVerificationReviewPage from "@/components/farmer-verification-review-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FarmerVerificationReviewPage />
    </Suspense>
  );
}
