import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";
import { Geist } from "next/font/google";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Examio",
  description: "Plataforma de Evaluaciones Antifraude",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} scroll-smooth`}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased flex flex-col pt-0 m-0 overflow-x-hidden">
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </Providers>
        {/* bloquea click derecho en toda la app */}
        <Script id="block-context-menu" strategy="afterInteractive">
          {`
            document.addEventListener('contextmenu', function(e) {
              e.preventDefault();
            });
          `}
        </Script>
      </body>
    </html>
  );
}
