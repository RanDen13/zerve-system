"use client";

import AppLogo from "@/app/components/AppLogo";
import { ModeToggle } from "@/app/components/mode-toggle";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AppRole = "OFFICER" | "APPROVER" | "ADMIN" | "SUPER_ADMIN";

interface SidebarProps {
  userRole: AppRole;
  userName?: string;
  userEmail?: string;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: AppRole[];
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/user/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Accounts",
    href: "/user/accounts",
    icon: <Users className="h-5 w-5" />,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Bookings",
    href: "/user/bookings",
    icon: <History className="h-5 w-5" />,
    roles: ["OFFICER", "APPROVER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "Calendar",
    href: "/user/calendar",
    icon: <CalendarDays className="h-5 w-5" />,
    roles: ["OFFICER", "APPROVER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "Venues",
    href: "/user/spaces",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    label: "Settings",
    href: "/user/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

const navTourTargets: Record<string, string> = {
  "/user/dashboard": "nav-dashboard",
  "/user/bookings": "nav-bookings",
  "/user/calendar": "nav-calendar",
  "/user/spaces": "nav-spaces",
  "/user/settings": "nav-settings",
};

function isNavActive(pathname: string, href: string) {
  if (href === "/user/bookings" && pathname.startsWith("/user/approvals")) {
    return true;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({
  userRole,
  userName,
  userEmail,
}: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const openSidebar = () => setIsMobileOpen(true);
    window.addEventListener("zerve:open-sidebar", openSidebar);

    return () => window.removeEventListener("zerve:open-sidebar", openSidebar);
  }, []);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border/70 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: -4, scale: 1.04 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary/10 p-1.5 text-sidebar-primary-foreground shadow-sm"
            >
              <AppLogo className="h-full w-full" variant="adaptive" priority />
            </motion.div>
            <div>
              <h2 className="text-base font-bold leading-tight">Zerve</h2>
              <p className="text-xs capitalize text-muted-foreground">
                {userRole.replaceAll("_", " ").toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {userName && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {userEmail}
            </p>
          </div>
        )}
      </div>

      <LayoutGroup>
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {navItems
            .filter((item) => !item.roles || item.roles.includes(userRole))
            .map((item) => {
              const isActive = isNavActive(pathname, item.href);
              return (
                <motion.div
                  key={item.href}
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 360, damping: 28 }}
                >
                  <Link
                    href={item.href}
                    data-tour={navTourTargets[item.href]}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "relative isolate flex items-center gap-3 overflow-visible rounded-lg px-4 py-3 transition-colors duration-200",
                      isActive
                        ? "text-sidebar-primary-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-page"
                        className="absolute inset-0 z-0 rounded-lg bg-sidebar-primary shadow-sm"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    )}
                    <span className="relative z-10">{item.icon}</span>
                    <span className="relative z-10 font-medium">
                      {item.label}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
        </nav>
      </LayoutGroup>

      <div className="space-y-2 border-t border-sidebar-border p-4">
        <Link href="/">
          <Button variant="outline" className="w-full justify-start gap-3">
            <Home className="h-5 w-5" />
            Home
          </Button>
        </Link>
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium">Theme</span>
          <ModeToggle />
        </div>
        <Link href="/signout">
          <Button variant="destructive" className="w-full justify-start gap-3">
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        data-tour="sidebar-menu"
        className="fixed left-4 top-4 z-40 rounded-lg border border-border bg-background p-2 shadow-lg lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 330, damping: 32 }}
              className="fixed bottom-0 left-0 top-0 z-50 w-72 border-r border-sidebar-border bg-sidebar shadow-xl lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-sidebar-border bg-sidebar shadow-sm lg:flex">
        <SidebarContent />
      </aside>
    </>
  );
}
