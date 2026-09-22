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
    <div className="flex h-[64px] items-center justify-between border-b border-[color:var(--hairline)] bg-white px-[40px]">
      <div className="flex items-center gap-[9px]">
        <span className="h-[21px] w-[21px] flex-none rounded-[5px] bg-[color:var(--naranja)]" />
        <span className="font-[var(--display)] text-[16.5px] font-bold tracking-[-0.01em]">
          Bloqbase
        </span>
      </div>
      <nav className="flex gap-[22px]">
        {LINKS.map((link) =>
          link.disabled ? (
            <span key={link.href} className="cursor-not-allowed text-[13.5px] text-[rgba(26,26,24,0.35)]">
              {link.label}
            </span>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "border-b-2 border-[color:var(--naranja)] pb-[4px] text-[13.5px] font-semibold text-[color:var(--grafito)] no-underline"
                  : "text-[13.5px] text-[rgba(26,26,24,0.55)] no-underline hover:text-[color:var(--grafito)]"
              }
            >
              {link.label}
            </Link>
          )
        )}
      </nav>
    </div>
  );
}
