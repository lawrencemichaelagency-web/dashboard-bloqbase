"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Resumen" },
  { href: "/marketing", label: "Marketing" },
  { href: "/ventas", label: "Ventas" },
  { href: "/producto", label: "Producto", disabled: true },
  { href: "/ingresos", label: "Ingresos", disabled: true },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <div className="bq-topbar">
      <div className="bq-brand">
        <span className="bq-brand-mark" />
        <span className="bq-brand-name">Bloqbase</span>
      </div>
      <nav className="bq-nav-links">
        {LINKS.map((link) =>
          link.disabled ? (
            <span key={link.href} className="bq-nav-link-disabled">
              {link.label}
            </span>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "bq-nav-link-active" : "bq-nav-link"}
            >
              {link.label}
            </Link>
          )
        )}
      </nav>
    </div>
  );
}
