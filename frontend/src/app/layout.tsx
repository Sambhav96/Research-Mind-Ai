import type { Metadata, Viewport } from "next";
// Removed next/font/google to prevent timeout
import { AppProviders } from "@/providers/app-providers";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import "./globals.css";

const geistSans = { variable: "--font-geist-sans" };
const geistMono = { variable: "--font-geist-mono" };

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — AI Research Operating System`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: ["AI", "research", "PDF", "semantic search", "flashcards", "RAG"],
  authors: [{ name: APP_NAME }],
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#030308" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen font-sans antialiased overflow-y-scroll scrollbar-gutter-stable">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
