import type { Metadata } from "next";
import type { PublicWebsite } from "./schema";
import { getSiteOrigin } from "@/lib/auth/config";
export function themeIcons(website: PublicWebsite): Metadata["icons"] {
  const path = website.design?.settings.favicon_path;
  return path
    ? {
        icon: [
          {
            url: `/s/${website.slug}/assets/${path.split("/")[1].replace(/\.webp$/, "")}`,
            type: "image/webp",
          },
        ],
      }
    : undefined;
}
export function detailMetadata(
  website: PublicWebsite,
  title: string,
  description: string,
  path: string,
): Metadata {
  const origin = getSiteOrigin();
  return {
    title: { absolute: `${title} | ${website.name}` },
    description,
    robots: { index: true, follow: true },
    icons: themeIcons(website),
    ...(origin ? { alternates: { canonical: origin + path } } : {}),
  };
}
