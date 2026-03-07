import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EDSA — Educational Story Adventure",
  description: "Backoffice for managing the Educational Story Adventure game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
