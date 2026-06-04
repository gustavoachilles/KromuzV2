import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaPrompt } from "@/components/ui/PwaPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kromuz V2 — Plataforma de Crédito Consignado",
  description: "Motor de regras com IA, simulador HISCON e gestão de crédito consignado.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Kromuz CRM",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaPrompt />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registrado com escopo: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker falha no registro: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
