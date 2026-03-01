import { Suspense } from "react";
import AccuracyDashboardPage from "@/components/AccuracyDashboardPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="loading-pulse text-lg" style={{ color: "var(--text-muted)" }}>Loading accuracy data...</div>
        </div>
      }
    >
      <AccuracyDashboardPage />
    </Suspense>
  );
}
