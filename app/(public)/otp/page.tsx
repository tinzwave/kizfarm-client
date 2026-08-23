import { Suspense } from "react";
import OtpPage from "@/components/otp-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="pt-32 text-center">Loading verification...</div>}>
      <OtpPage />
    </Suspense>
  );
}
