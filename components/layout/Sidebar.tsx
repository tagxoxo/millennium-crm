import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/policies", label: "Policies", icon: "📋" },
  { href: "/import", label: "Import", icon: "📥" },
  { href: "/automations", label: "Automations", icon: "⚡" },
];

export default function Sidebar() {
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
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-navy-lighter hover:text-white transition-colors"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export { navItems };
