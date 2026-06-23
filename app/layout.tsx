import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
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
      <body className="min-h-screen bg-navy text-gray-100">
        <Sidebar />
        <main className="md:ml-64 pb-20 md:pb-8">
          <div className="p-4 md:p-8">{children}</div>
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
