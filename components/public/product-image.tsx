"use client";
/* Product uploads are already resized WebP; proxy responses must remain uncached. */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Package } from "lucide-react";
export function PublicProductImage({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="storefront-image">
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <Package size={42} aria-hidden="true" />
          <span className="sr-only">No image available for {alt}</span>
        </>
      )}
    </div>
  );
}
