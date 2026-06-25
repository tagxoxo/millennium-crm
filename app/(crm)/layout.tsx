import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import GlobalSearch from "@/components/layout/GlobalSearch";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="md:ml-64 pb-20 md:pb-8">
        <div className="hidden md:flex items-center justify-end px-8 pt-6 pb-2">
          <GlobalSearch />
        </div>
        <div className="p-4 md:p-8 md:pt-4">{children}</div>
      </main>
      <MobileNav />
    </>
  );
}
