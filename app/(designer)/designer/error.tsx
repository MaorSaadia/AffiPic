"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main style={{ padding: 40 }}>
      <h1>The designer could not be loaded</h1>
      <p>
        Your saved website has not changed. Check the designer migration and
        connection, then retry.
      </p>
      <button onClick={reset}>Retry</button>{" "}
      <Link href="/dashboard/settings">Back to settings</Link>
    </main>
  );
}
