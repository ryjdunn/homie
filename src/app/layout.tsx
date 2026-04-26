import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homie",
  description: "A mobile-first household task board for Ryan and Caroline.",
  appleWebApp: {
    capable: true,
    title: "Homie",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
