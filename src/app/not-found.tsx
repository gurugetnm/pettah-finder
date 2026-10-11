import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="shell error-panel">
      <span className="eyebrow">A LITTLE OFF THE BEATEN PATH · 404</span>
      <h1 className="mt-4">We couldn’t find that street.</h1>
      <p>This page may have moved, or the street isn’t in our guide yet.</p>
      <Button asChild>
        <Link href="/streets">Explore the street directory</Link>
      </Button>
    </div>
  );
}
