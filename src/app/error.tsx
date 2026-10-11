"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="shell error-panel">
      <h1>Our guide is taking a moment.</h1>
      <p>We couldn’t load the shopping guide. Please try again shortly.</p>
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}
