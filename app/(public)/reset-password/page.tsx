import { Suspense } from "react";
import ResetPasswordPage from "@/components/reset-password-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 pt-32 text-center">
          <span className="material-symbols-outlined animate-spin">autorenew</span>
          Loading...
        </div>
      }
    >
      <ResetPasswordPage />
    </Suspense>
  );
}
