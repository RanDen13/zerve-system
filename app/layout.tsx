import PopupProvider from "@/app/components/Popup/PopupProvider";
import NetworkStatus from "@/app/components/NetworkStatus";
import { ThemeProvider } from "@/app/components/theme-provider";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { PublicEnvScript } from "next-runtime-env";
import { EB_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zerve",
  description:
    "Officer-only venue reservation and approval workflow for La Consolacion University Philippines.",
  icons: {
    icon: "/logo_app.png",
    apple: "/logo_app.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn(
        geistSans.variable,
        geistMono.variable,
        ebGaramond.variable,
      )}
    >
      <head>
        <PublicEnvScript />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PopupProvider>
            {children}
            <NetworkStatus />
          </PopupProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
