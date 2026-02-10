import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/components/audio/AudioProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { XPWrapper } from "@/components/theme/XPWrapper";

// Initialize RAG system on server startup (production only)
// Note: Disabled in development to prevent re-initialization on hot reload
if (process.env.NODE_ENV === 'production') {
  import('@/lib/rag/startup');
}

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const lora = Lora({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Permaculture.Studio - Permaculture Planning Platform",
  description: "AI-first map-based permaculture planning for small farmers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body>
        <ThemeProvider>
          <XPWrapper>
            <AudioProvider>
              {children}
            </AudioProvider>
          </XPWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
