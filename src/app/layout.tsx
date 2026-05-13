import type { Metadata, Viewport } from "next";
import { homieThemeCss, webAppThemeColors } from "./theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homie",
  description: "A mobile-first household task board for Ryan and Caroline.",
  icons: {
    icon: [
      {
        url: "/icons/homie-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/homie-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Homie",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: webAppThemeColors.theme,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <style id="homie-theme" dangerouslySetInnerHTML={{ __html: homieThemeCss }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
