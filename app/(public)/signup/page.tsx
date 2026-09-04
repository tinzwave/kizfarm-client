import { Suspense } from "react";
import SignUpPage from "@/components/sign-up-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="pt-32 text-center">Loading...</div>}>
      <SignUpPage />
    </Suspense>
  );
}
