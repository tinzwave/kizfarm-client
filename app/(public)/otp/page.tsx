import { Suspense } from "react";
import OtpPage from "@/components/otp-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 pt-32 text-center">
          <span className="material-symbols-outlined animate-spin">autorenew</span>
          Loading verification...
        </div>
      }
    >
      <OtpPage />
    </Suspense>
  );
}
