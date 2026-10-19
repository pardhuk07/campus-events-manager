import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "ACM Conflict Manager",
    template: "%s | ACM NIT Surat",
  },
  description:
    "Centralized event and expense management system for ACM NIT Surat — conflict-aware scheduling and transparent fund tracking.",
  keywords: ["ACM", "NIT Surat", "events", "expenses", "conflict detection"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`min-h-screen bg-slate-50 text-slate-900 antialiased ${inter.className}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
