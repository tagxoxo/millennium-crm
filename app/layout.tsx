import "./globals.css";

export const metadata = {
  title: "Millennium CRM",
  description: "Auto insurance agency CRM for Clarksville, TN",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-navy text-gray-100">{children}</body>
    </html>
  );
}
