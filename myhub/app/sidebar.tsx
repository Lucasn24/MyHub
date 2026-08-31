"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Mail, DollarSign, ListTodo, Settings } from "lucide-react";
import styles from "./sidebar.module.css";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/expenses", label: "Expenses", icon: DollarSign },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <aside className={styles.sidebar}>
      <div>
        <div className={styles.logo}>myHub.</div>

        <nav className={styles.nav}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <ThemeToggle />
    </aside>
  );
}
