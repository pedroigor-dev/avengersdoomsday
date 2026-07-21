import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOOMSDAY IS COMING",
  description: "Avengers: Doomsday | Only In Theaters December 18",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
