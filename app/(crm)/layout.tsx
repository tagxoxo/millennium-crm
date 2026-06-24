import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="md:ml-64 pb-20 md:pb-8">
        <div className="p-4 md:p-8">{children}</div>
      </main>
      <MobileNav />
    </>
  );
}
