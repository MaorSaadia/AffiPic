"use client";
import { Button } from "@/components/ui/button";
export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <section className="panel coming-soon">
      <h1>We couldn’t load this page.</h1>
      <p>
        Please try again in a moment. If the problem continues, your account
        setup may need attention.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
