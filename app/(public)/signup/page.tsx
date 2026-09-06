import { Suspense } from "react";
import SignUpPage from "@/components/sign-up-page";

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
      <SignUpPage />
    </Suspense>
  );
}
