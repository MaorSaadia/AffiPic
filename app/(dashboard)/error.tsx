"use client";
import { Button } from "@/components/ui/button";
import { SignoutButton } from "@/components/auth/signout-button";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <main className="workspace-load-error">
      <section className="panel coming-soon">
        <h1>Your workspace couldn’t be loaded.</h1>
        <p>
          Your saved data hasn’t been changed. Please try again. If this
          continues, the database connection or website setup may need
          attention.
        </p>
        <Button className="mt-6 mb-3" onClick={reset}>
          Try again
        </Button>
        <SignoutButton />
      </section>
    </main>
  );
}
