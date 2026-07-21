import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOOMSDAY - DEVPEDRO",
  description: "Avengers: Doomsday | Only In Theaters December 18",
  icons: {
    icon: [{ url: "/avengers-a.svg", type: "image/svg+xml" }],
    shortcut: "/avengers-a.svg",
    apple: "/avengers-a.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
