import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeDrop — Claude's Busy. Meet Someone.",
  description:
    "Video chat with another dev while Claude writes your code. Automatic matching, peer-to-peer, completely private. Free forever.",
  keywords: [
    "vibedrop",
    "vibe coding",
    "claude code",
    "video chat",
    "webrtc",
    "peer to peer",
    "developer tools",
    "ai coding",
    "pair programming",
    "dev community",
  ],
  authors: [{ name: "VibeDrop" }],
  creator: "VibeDrop",
  metadataBase: new URL("https://vibedrop.pro"),
  alternates: { canonical: "/" },
  icons: { icon: "/logo.svg", apple: "/logo.svg" },
  openGraph: {
    title: "VibeDrop — Claude's Busy. Meet Someone.",
    description:
      "Video chat with devs while AI writes your code. Activates automatically, closes when it's done.",
    type: "website",
    url: "https://vibedrop.pro",
    siteName: "VibeDrop",
    images: [
      {
        url: "/thumbnail-vibetalk.jpg",
        width: 1200,
        height: 630,
        alt: "VibeDrop — Talk to devs while Claude codes",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeDrop — Claude's Busy. Meet Someone.",
    description:
      "Video chat with devs while AI writes your code. Automatic, private, free.",
    images: ["/thumbnail-vibetalk.jpg"],
    creator: "@vibedrop",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
