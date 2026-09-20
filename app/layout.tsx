import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AffiPic — Your creator workspace",
    template: "%s | AffiPic",
  },
  description:
    "Build a home for your favorite finds. AffiPic helps creators curate products and create their own affiliate websites.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
