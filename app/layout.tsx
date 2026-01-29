import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ARIS — Кыргызча үн жардамчы",
  description: "ARIS браузерде иштеген кыргызча үн жардамчы"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ky">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
