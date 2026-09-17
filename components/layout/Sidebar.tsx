import Link from "next/link";
import LogoutButton from "./LogoutButton";

const navItems: { href: string; label: string; icon: string; nested?: boolean }[] = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/ticket-center", label: "Ticket Center", icon: "🎫" },
  { href: "/ticket-center/insights", label: "VA Insights", icon: "📌", nested: true },
  { href: "/retention", label: "Retention Center", icon: "🔄" },
  { href: "/service-center", label: "Service Center", icon: "🎧" },
  { href: "/sales-center", label: "Sales Center", icon: "🎯" },
  { href: "/clients", label: "Clients", icon: "👥" },
  { href: "/policies", label: "Policies", icon: "📋" },
  { href: "/automations", label: "Automations", icon: "⚡" },
  { href: "/import", label: "Import", icon: "📥" },
  { href: "/insights", label: "Book Insights", icon: "📈" },
  { href: "/settings/2fa", label: "Security", icon: "🔐" },
];

export default function Sidebar({
  openTicketCount = 0,
}: {
  openTicketCount?: number;
}) {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-navy-light border-r border-navy-lighter">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white">Millennium CRM</h1>
        <p className="text-xs text-gray-400 mt-1">Clarksville, TN</p>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-navy-lighter hover:text-white transition-colors ${
              item.nested ? "ml-4 py-2 text-sm" : ""
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.href === "/ticket-center" && (
              <span
                className={`ml-auto min-w-[1.25rem] h-5 px-1 rounded-full text-[11px] font-semibold flex items-center justify-center ${
                  openTicketCount > 0
                    ? "bg-accent text-white"
                    : "bg-navy-lighter text-gray-400"
                }`}
              >
                {openTicketCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-navy-lighter">
        <LogoutButton />
      </div>
    </aside>
  );
}

export { navItems };
