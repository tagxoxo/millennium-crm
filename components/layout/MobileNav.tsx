"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./Sidebar";

export default function MobileNav({
  openTicketCount = 0,
}: {
  openTicketCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-navy-light border-t border-navy-lighter z-50">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center px-3 py-2 text-xs ${
                isActive ? "text-accent" : "text-gray-400"
              }`}
            >
              <span className="text-lg relative">
                {item.icon}
                {item.href === "/ticket-center" && openTicketCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[1rem] h-4 px-1 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center">
                    {openTicketCount}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
