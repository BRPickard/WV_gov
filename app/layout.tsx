import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WV Document Library",
  description: "A simple, permission-aware library for shared Excel workbooks.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
