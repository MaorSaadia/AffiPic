"use client";
/* Logos are already resized; private and blob URLs must bypass the image optimizer. */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
export function BrandLogo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? null : (
    <img
      src={src}
      alt=""
      width={44}
      height={44}
      className="storefront-logo"
      onError={() => setFailed(true)}
    />
  );
}
