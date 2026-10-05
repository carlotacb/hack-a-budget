"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  ChartColumn,
  LayoutDashboard,
  List,
  Plane,
  Settings2,
  Users,
} from "lucide-react";
import type { Role } from "@prisma/client";

const links: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  travelOnly?: boolean;
  requiresBudgetPermission?: boolean;
}[] = [
  {
    href: "/organizer",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "DIRECTOR", "ORGANIZER", "ORGANIZER_LEAD"],
  },
  {
    href: "/organizer/budget",
    label: "Budget",
    icon: Banknote,
    roles: ["ADMIN", "DIRECTOR", "ORGANIZER", "ORGANIZER_LEAD"],
    requiresBudgetPermission: true,
  },
  {
    href: "/organizer/expenses",
    label: "Expenses",
    icon: List,
    roles: ["ADMIN", "DIRECTOR", "ORGANIZER", "ORGANIZER_LEAD"],
  },
  {
    href: "/organizer/travel-reimbursements",
    label: "Travel",
    icon: Plane,
    roles: ["ADMIN", "DIRECTOR"],
    travelOnly: true,
  },
  {
    href: "/organizer/travel-dashboard",
    label: "Travel dashboard",
    icon: ChartColumn,
    roles: ["ADMIN", "DIRECTOR"],
    travelOnly: true,
  },
  {
    href: "/organizer/users",
    label: "Users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    href: "/organizer/settings",
    label: "Settings",
    icon: Settings2,
    roles: ["ADMIN"],
  },
];

export function OrganizerNav({
  role,
  travelReimbursementEnabled,
  canSeeBudget,
}: {
  role: Role;
  travelReimbursementEnabled: boolean;
  canSeeBudget: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 lg:px-8">
        {links
          .filter((link) => link.roles.includes(role))
          .filter((link) => !link.travelOnly || travelReimbursementEnabled)
          .filter((link) => !link.requiresBudgetPermission || canSeeBudget)
          .map(({ href, label, icon: Icon }) => {
            const active =
              href === "/organizer"
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={`organizer-nav-link ${active ? "organizer-nav-link-active" : ""}`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
