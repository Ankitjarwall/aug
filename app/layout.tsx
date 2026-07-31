import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Ankit & you", description: "A cinematic story of us", manifest: "./manifest.webmanifest" };
export const viewport: Viewport = { themeColor: "#141414", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
