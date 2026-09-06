import CourseDetailPage from "@/components/course-detail-page";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 p-8 text-sm text-slate-600">
          <span className="material-symbols-outlined animate-spin">autorenew</span>
          Loading course...
        </div>
      }
    >
      <CourseDetailPage />
    </Suspense>
  );
}
