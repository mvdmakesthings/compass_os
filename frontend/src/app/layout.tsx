import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/dates/styles.css";
import "./globals.css";

import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";

import { AppShellChrome } from "@/components/shell/AppShell";
import { theme } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Compass V2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      {...mantineHtmlProps}
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <ColorSchemeScript forceColorScheme="dark" />
      </head>
      <body>
        <MantineProvider
          theme={theme}
          defaultColorScheme="dark"
          forceColorScheme="dark"
        >
          <ModalsProvider>
            <Notifications position="bottom-right" />
            <AppShellChrome>{children}</AppShellChrome>
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
