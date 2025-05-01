import { initTranslationService } from "@/app/utils/init";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const metadata: Metadata = {
  title: "Voice Translator App",
  description: "A real-time voice translation application",
};

// Initialize the translation service on the server
export async function generateMetadata() {
  // This function runs on the server during build and on request,
  // which gives us an opportunity to initialize our services
  if (typeof window === "undefined") {
    try {
      // Preload the translation model
      await initTranslationService();
    } catch (error) {
      console.error("Failed to initialize services:", error);
      // Continue rendering even if initialization fails
    }
  }

  // Return the metadata (can be the same as the static export above)
  return metadata;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
