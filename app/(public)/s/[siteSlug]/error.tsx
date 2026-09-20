"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="storefront-message">
      <h1>This website could not be loaded</h1>
      <p>Please try again in a moment.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
