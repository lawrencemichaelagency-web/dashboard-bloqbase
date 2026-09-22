# Dashboard Ejecutivo BLOQBASE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new internal Next.js dashboard (`dashboard-bloqbase`) that shows Marketing and Ventas KPIs for BLOQBASE at a glance, reading daily-precomputed data from a new `dashboard.*` schema in the existing Supabase project, replacing the current pattern of ~15 separate n8n email reports.

**Architecture:** Next.js 15 App Router + TypeScript + Tailwind, deployed on Vercel. A daily Vercel Cron endpoint aggregates data from `seo.*`, `social.*`, `ventas.*` (read via a dedicated read-only Postgres role) plus 3 Google Sheets (read via the existing Google service account), and writes the results into new `dashboard.*` tables. All UI pages read only from `dashboard.*` — never touch `seo.*`/`social.*`/`ventas.*` directly, and never write to any n8n-owned table or Sheet. Visual design is copied 1:1 from `Bloqbase_Componentes.html`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, `postgres` npm package (postgres.js) for the DB client, `googleapis` for Sheets reads, Vercel Cron for the daily job, Supabase Auth (`@supabase/ssr`) for login.

---

## Before you start

Read these files first — they contain decisions you must not re-litigate:
- `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase\docs\specs\2026-09-22-dashboard-ejecutivo-bloqbase-design.md` — the approved design spec.
- `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase\docs\specs\supabase-connection.md` — real connection details for the read-only role, and the security note about TLS (never disable cert verification).
- `C:\Users\gance\Desktop\BLOQBASE\01_MARCA\Bloqbase_Componentes.html` — the single source of truth for every visual component. Do not invent new colors, spacing, or typography scales — copy the CSS classes/values from this file.

---

## Task 1: Project scaffold

**Files:**
- Create: `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase\package.json`
- Create: `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase\tsconfig.json`
- Create: `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase\next.config.ts`
- Create: `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase\tailwind.config.ts`
- Create: `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase\postcss.config.mjs`
- Create: `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase\src\app\layout.tsx`
- Create: `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase\src\app\globals.css`
- Create: `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase\.gitignore`
- Create: `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase\.env.example`

- [ ] **Step 1: Scaffold the Next.js app**

Run (from `C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD`):
```bash
npx create-next-app@15 dashboard-bloqbase --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
```
When prompted, accept defaults. This creates the base scaffold; the following steps overwrite specific files.

- [ ] **Step 2: Install runtime dependencies**

Run (from `dashboard-bloqbase/`):
```bash
npm install postgres googleapis @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules
.next
.env
.env.local
*.log
```

- [ ] **Step 4: Write `.env.example`**

```bash
# Supabase Auth (public dashboard project, NOT the data-source project)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Read-only connection to the BLOQBASE data Supabase project (seo/social/ventas schemas)
# See docs/specs/supabase-connection.md for how this was created.
DASHBOARD_DATABASE_URL=

# Google service account used by n8n for Sheets reads (JSON key, base64-encoded)
GOOGLE_SERVICE_ACCOUNT_KEY_B64=

# Cron auth (Vercel sends this header on scheduled invocations)
CRON_SECRET=
```

- [ ] **Step 5: Replace `src/app/globals.css` with the Bloqbase design tokens**

Copy the full `:root` variable block and base body/link/selection styles from `Bloqbase_Componentes.html` lines 11-29 into `globals.css`, replacing whatever `create-next-app` generated:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root{
  --grafito:#1A1A18; --naranja:#FF2C00; --naranja-hover:#E62800; --naranja-texto:#CC2300;
  --amarillo:#F5B700; --amarillo-texto:#8A6800; --teal:#16A085; --teal-texto:#0F7A66;
  --lienzo:#EDEDEB; --tarjeta:#FCFCFB; --hairline:#E3E3E1; --separador:#EEEEEF;
  --borde-input:#E4E4E6; --borde-boton:#DEDEDC; --chip:#F2F2F0; --disabled:#DCDCDA;
  --mono:'Space Mono',monospace; --display:'Space Grotesk',sans-serif; --sans:Inter,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;background:var(--lienzo);color:var(--grafito);font-family:var(--sans);-webkit-font-smoothing:antialiased;
  background-image:linear-gradient(rgba(26,26,24,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(26,26,24,0.05) 1px,transparent 1px);
  background-size:56px 56px;}
a{color:var(--naranja)}
a:hover{color:var(--naranja-texto)}
::selection{background:var(--naranja);color:#fff}
@keyframes bq-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
```

- [ ] **Step 6: Add Google Fonts to `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bloqbase — Panel ejecutivo",
  description: "Marketing y ventas de BLOQBASE de un vistazo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Verify the scaffold builds**

Run: `npm run build`
Expected: build succeeds with no errors (there will be a default page — that's fine, Task 5 replaces it).

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold dashboard-bloqbase Next.js app with Bloqbase design tokens"
```

---

## Task 2: Core UI components (Bloqbase design system)

**Files:**
- Create: `src/core/components/MetricCard.tsx`
- Create: `src/core/components/Badge.tsx`
- Create: `src/core/components/Table.tsx`
- Create: `src/core/components/Timeline.tsx`
- Create: `src/core/components/EmptyState.tsx`
- Create: `src/core/components/NavBar.tsx`
- Test: `src/core/components/__tests__/MetricCard.test.tsx`
- Test: `src/core/components/__tests__/Badge.test.tsx`

This task ports the visual vocabulary from `Bloqbase_Componentes.html` sections 03, 04, 05, 06, 08 into typed React components. No business logic here — pure presentation, driven by props.

- [ ] **Step 1: Install testing dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

Create `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing test for MetricCard**

```tsx
// src/core/components/__tests__/MetricCard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricCard } from "../MetricCard";

describe("MetricCard", () => {
  it("renders label, value, and a positive delta pill", () => {
    render(<MetricCard label="Obras activas" value="14" delta={{ direction: "good", text: "+2" }} note="este trimestre" />);
    expect(screen.getByText("Obras activas")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("este trimestre")).toBeInTheDocument();
  });

  it("renders without a delta when none is provided", () => {
    render(<MetricCard label="Sin dato" value="—" />);
    expect(screen.getByText("Sin dato")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- MetricCard`
Expected: FAIL with "Cannot find module '../MetricCard'"

- [ ] **Step 4: Implement MetricCard**

```tsx
// src/core/components/MetricCard.tsx
export type MetricDelta = {
  direction: "good" | "bad";
  text: string;
};

export function MetricCard({
  label,
  value,
  delta,
  note,
}: {
  label: string;
  value: string;
  delta?: MetricDelta;
  note?: string;
}) {
  return (
    <div className="rounded-[14px] border border-[color:var(--hairline)] bg-[color:var(--tarjeta)] p-[22px_24px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(26,26,24,0.55)]">
        {label}
      </div>
      <div className="mt-[14px] font-mono text-[30px] font-bold tracking-[-0.02em]">
        {value}
      </div>
      {delta || note ? (
        <div className="mt-[12px] flex items-center gap-[7px]">
          {delta ? (
            <span
              className={
                "rounded-[4px] px-[7px] py-[3px] font-mono text-[10.5px] font-bold tracking-[0.08em] " +
                (delta.direction === "good"
                  ? "bg-[rgba(22,160,133,0.1)] text-[color:var(--teal-texto)]"
                  : "bg-[rgba(255,44,0,0.08)] text-[color:var(--naranja-texto)]")
              }
            >
              {delta.text}
            </span>
          ) : null}
          {note ? <span className="text-[11.5px] text-[rgba(26,26,24,0.5)]">{note}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- MetricCard`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the failing test for Badge**

```tsx
// src/core/components/__tests__/Badge.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../Badge";

describe("Badge", () => {
  it("renders the status label", () => {
    render(<Badge status="hecho">Hecho</Badge>);
    expect(screen.getByText("Hecho")).toBeInTheDocument();
  });

  it("applies a distinct class per status so pendiente and hecho don't share a background", () => {
    const { container: pendiente } = render(<Badge status="pendiente">Pendiente</Badge>);
    const { container: hecho } = render(<Badge status="hecho">Hecho</Badge>);
    const pendienteClass = pendiente.querySelector("span")?.className;
    const hechoClass = hecho.querySelector("span")?.className;
    expect(pendienteClass).not.toEqual(hechoClass);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- Badge`
Expected: FAIL with "Cannot find module '../Badge'"

- [ ] **Step 8: Implement Badge**

Status classes ported from `Bloqbase_Componentes.html` section 03 (`.badge-*`):

```tsx
// src/core/components/Badge.tsx
export type BadgeStatus =
  | "pendiente"
  | "en_curso"
  | "en_revision"
  | "bloqueado"
  | "hecho"
  | "archivado";

const STATUS_CLASSES: Record<BadgeStatus, string> = {
  pendiente: "bg-[color:var(--chip)] text-[rgba(26,26,24,0.62)] border-transparent",
  en_curso: "bg-white text-[color:var(--grafito)] border-[color:var(--borde-boton)]",
  en_revision:
    "bg-[rgba(245,183,0,0.12)] text-[color:var(--amarillo-texto)] border-[rgba(245,183,0,0.4)]",
  bloqueado:
    "bg-[rgba(255,44,0,0.08)] text-[color:var(--naranja-texto)] border-[rgba(255,44,0,0.35)]",
  hecho: "bg-[rgba(22,160,133,0.08)] text-[color:var(--teal-texto)] border-[rgba(22,160,133,0.3)]",
  archivado: "bg-transparent text-[rgba(26,26,24,0.45)] border-[color:var(--hairline)]",
};

export function Badge({ status, children }: { status: BadgeStatus; children: React.ReactNode }) {
  return (
    <span
      className={
        "inline-block rounded-full border px-[12px] py-[6px] font-mono text-[9.5px] font-bold uppercase tracking-[0.13em] " +
        STATUS_CLASSES[status]
      }
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- Badge`
Expected: PASS (2 tests)

- [ ] **Step 10: Implement Table (no test — presentational passthrough, covered by module-level tests in Task 5/6)**

```tsx
// src/core/components/Table.tsx
export type TableColumn<T> = {
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
};

export function Table<T>({
  title,
  count,
  columns,
  rows,
  rowKey,
}: {
  title: string;
  count?: string;
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[color:var(--hairline)] bg-[color:var(--tarjeta)]">
      <div className="flex items-center justify-between border-b border-[color:var(--separador)] bg-white px-[22px] py-[18px]">
        <div className="flex items-center gap-[12px]">
          <span className="font-[var(--display)] text-[16px] font-semibold tracking-[-0.015em]">
            {title}
          </span>
          {count ? (
            <span className="rounded-[4px] bg-[color:var(--chip)] px-[8px] py-[4px] font-mono text-[10px] font-bold tracking-[0.1em] text-[rgba(26,26,24,0.5)]">
              {count}
            </span>
          ) : null}
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="h-[42px] bg-[#F7F7F5]">
            {columns.map((col) => (
              <th
                key={col.header}
                className={
                  "px-[22px] font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[rgba(26,26,24,0.55)] " +
                  (col.align === "right" ? "text-right" : "text-left")
                }
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-[#F2F2F0]">
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={"px-[22px] py-[14px] " + (col.align === "right" ? "text-right" : "text-left")}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <div className="p-[24px] text-center text-[13px] text-[rgba(26,26,24,0.5)]">
          Sin filas que mostrar.
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 11: Implement Timeline**

```tsx
// src/core/components/Timeline.tsx
export type TimelineItem = {
  id: string;
  dateLabel: string;
  title: string;
  by: string;
  dotColor: string;
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative mt-[22px] pl-[22px]">
      <div className="absolute bottom-[6px] left-[4px] top-[6px] w-px bg-[color:var(--hairline)]" />
      {items.map((item, i) => (
        <div key={item.id} className={i === items.length - 1 ? "relative" : "relative mb-[22px]"}>
          <span
            className="absolute -left-[22px] top-[3px] h-[9px] w-[9px] rounded-full"
            style={{ background: item.dotColor, boxShadow: "0 0 0 3px var(--tarjeta)" }}
          />
          <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[rgba(26,26,24,0.5)]">
            {item.dateLabel}
          </div>
          <div className="mt-[5px] text-[14px] font-medium">{item.title}</div>
          <div className="mt-[4px] text-[12.5px] leading-[1.5] text-[rgba(26,26,24,0.55)]">{item.by}</div>
        </div>
      ))}
      {items.length === 0 ? (
        <div className="text-[13px] text-[rgba(26,26,24,0.5)]">Sin eventos recientes.</div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 12: Implement EmptyState**

```tsx
// src/core/components/EmptyState.tsx
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#D9D9D6] bg-white p-[40px_28px] text-center">
      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[12px] border border-[color:var(--hairline)] bg-[#FBFBF9]">
        <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="rgba(26,26,24,.4)" strokeWidth="1.2">
          <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
          <path d="M2.5 6.5h11M6.5 6.5v7" />
        </svg>
      </div>
      <div className="mt-[18px] font-[var(--display)] text-[18px] font-semibold tracking-[-0.015em]">
        {title}
      </div>
      <div className="mt-[9px] max-w-[280px] text-[13.5px] leading-[1.55] text-[rgba(26,26,24,0.55)]">
        {description}
      </div>
    </div>
  );
}
```

- [ ] **Step 13: Implement NavBar**

```tsx
// src/core/components/NavBar.tsx
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
```

- [ ] **Step 14: Run the full component test suite**

Run: `npm test`
Expected: PASS (4 tests total: 2 MetricCard + 2 Badge)

- [ ] **Step 15: Commit**

```bash
git add src/core/components vitest.config.ts vitest.setup.ts package.json
git commit -m "feat: add core UI components ported from Bloqbase design system"
```

---

## Task 3: Database client for the read-only BLOQBASE data connection

**Files:**
- Create: `src/core/lib/db.ts`
- Create: `src/core/lib/db-ca-cert.ts`
- Test: `src/core/lib/__tests__/db.test.ts`

This wraps `postgres` (postgres.js) exactly like `dashboard-excelsius`'s `db.ts` wraps `@vercel/postgres`: one shared `sql` tagged-template client, degrade gracefully (log + return empty) if the env var is missing, never throw and crash a page.

- [ ] **Step 1: Download the Supabase CA certificate**

Run:
```bash
curl -o src/core/lib/supabase-ca.pem https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
```
Expected: a PEM file is saved. Verify it starts with `-----BEGIN CERTIFICATE-----`:
```bash
head -1 src/core/lib/supabase-ca.pem
```
Expected output: `-----BEGIN CERTIFICATE-----`

- [ ] **Step 2: Write the failing test for the db client's degrade-on-missing-env behavior**

```ts
// src/core/lib/__tests__/db.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

describe("getSql", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.DASHBOARD_DATABASE_URL;
  });

  it("throws a clear error when DASHBOARD_DATABASE_URL is missing, so callers can catch it", async () => {
    delete process.env.DASHBOARD_DATABASE_URL;
    const { getSql } = await import("../db");
    expect(() => getSql()).toThrowError(/DASHBOARD_DATABASE_URL/);
  });

  it("returns a callable sql client when the env var is set", async () => {
    process.env.DASHBOARD_DATABASE_URL =
      "postgresql://user:pass@localhost:5432/postgres";
    const { getSql } = await import("../db");
    const sql = getSql();
    expect(typeof sql).toBe("function");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- db.test`
Expected: FAIL with "Cannot find module '../db'"

- [ ] **Step 4: Implement `db.ts`**

```ts
// src/core/lib/db.ts
import postgres from "postgres";
import { readFileSync } from "node:fs";
import path from "node:path";

let cachedSql: ReturnType<typeof postgres> | null = null;

function loadCaCert(): string {
  return readFileSync(path.join(process.cwd(), "src/core/lib/supabase-ca.pem"), "utf8");
}

export function getSql() {
  const connectionString = process.env.DASHBOARD_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DASHBOARD_DATABASE_URL no está definida. Revisa las variables de entorno del proyecto en Vercel."
    );
  }
  if (!cachedSql) {
    cachedSql = postgres(connectionString, {
      ssl: { ca: loadCaCert() },
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });
  }
  return cachedSql;
}

/**
 * Runs a query and returns [] instead of throwing, logging a warning.
 * Use this from page/API code paths where a single failed section must
 * not crash the whole dashboard (see design spec: "Manejo de errores").
 */
export async function queryOrEmpty<T>(label: string, fn: (sql: ReturnType<typeof postgres>) => Promise<T[]>): Promise<T[]> {
  try {
    const sql = getSql();
    return await fn(sql);
  } catch (err) {
    console.warn(`[dashboard-bloqbase] query failed: ${label}`, err);
    return [];
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- db.test`
Expected: PASS (2 tests)

- [ ] **Step 6: Add the CA cert path to `.gitignore` exceptions (it's a public cert, safe to commit, but verify no `.pem` blanket ignore exists)**

Check `.gitignore` does not contain `*.pem`. If the scaffold added one, remove that line — the CA cert must be committed since it's not a secret (it's Supabase's public root CA).

- [ ] **Step 7: Commit**

```bash
git add src/core/lib/db.ts src/core/lib/supabase-ca.pem src/core/lib/__tests__/db.test.ts
git commit -m "feat: add read-only Postgres client for the BLOQBASE data connection"
```

---

## Task 4: Marketing data module (queries + cron aggregation)

**Files:**
- Create: `src/modules/marketing/lib/queries.ts`
- Create: `src/modules/marketing/lib/types.ts`
- Test: `src/modules/marketing/lib/__tests__/queries.test.ts`
- Create: `db/001_dashboard_schema.sql` (migration, applied manually via Task 7)

This task defines the SQL that reads from `seo.*`/`social.*` (via the read-only role) and the shape that gets written into the new `dashboard.*` tables. The actual cron endpoint that ties this together is Task 6.

- [ ] **Step 1: Write the `dashboard` schema migration SQL**

```sql
-- db/001_dashboard_schema.sql
-- Read-only-consumer tables owned by dashboard-bloqbase. Nothing else
-- writes to this schema. Safe to re-run.

create schema if not exists dashboard;

create table if not exists dashboard.marketing_diario (
  id bigserial primary key,
  fecha date not null unique,
  clicks_30d integer not null default 0,
  impresiones_30d integer not null default 0,
  posicion_media numeric(5,2),
  paginas_publicadas integer not null default 0,
  paginas_total integer not null default 0,
  formularios_iniciados_30d integer not null default 0,
  formularios_completados_30d integer not null default 0,
  oportunidades_pendientes integer not null default 0,
  spark_clicks_12sem jsonb not null default '[]'::jsonb,
  oportunidades jsonb not null default '[]'::jsonb,
  redes jsonb not null default '[]'::jsonb,
  generado_en timestamptz not null default now()
);

create table if not exists dashboard.ventas_diario (
  id bigserial primary key,
  fecha date not null unique,
  llamadas_7d integer not null default 0,
  llamadas_positivas_7d integer not null default 0,
  leads_nuevos_semana integer not null default 0,
  llamadas_recientes jsonb not null default '[]'::jsonb,
  pipeline_prospeccion jsonb not null default '[]'::jsonb,
  generado_en timestamptz not null default now()
);

create table if not exists dashboard.sync_log (
  id bigserial primary key,
  seccion text not null,
  ok boolean not null,
  error text,
  ejecutado_en timestamptz not null default now()
);
```

- [ ] **Step 2: Write `types.ts`**

```ts
// src/modules/marketing/lib/types.ts
export type MarketingOportunidad = {
  id: string;
  tipo: string;
  score: number | null;
  estado: string;
  detectadaPorIa: boolean;
};

export type MarketingRedSocial = {
  canal: string;
  posts: number;
  alcance: number;
};

export type MarketingSnapshot = {
  fecha: string;
  clicks30d: number;
  impresiones30d: number;
  posicionMedia: number | null;
  paginasPublicadas: number;
  paginasTotal: number;
  formulariosIniciados30d: number;
  formulariosCompletados30d: number;
  oportunidadesPendientes: number;
  sparkClicks12Sem: number[];
  oportunidades: MarketingOportunidad[];
  redes: MarketingRedSocial[];
};
```

- [ ] **Step 3: Write the failing test for the marketing aggregation query function**

The function under test takes a `sql` client (dependency-injected, so the test can pass a fake) and returns a `MarketingSnapshot`. This avoids hitting a real database in unit tests.

```ts
// src/modules/marketing/lib/__tests__/queries.test.ts
import { describe, expect, it, vi } from "vitest";
import { buildMarketingSnapshot } from "../queries";

function fakeSql(rows: Record<string, unknown[]>) {
  const fn = vi.fn(async (strings: TemplateStringsArray) => {
    const key = Object.keys(rows).find((k) => strings.join("").includes(k));
    return key ? rows[key] : [];
  });
  return fn as unknown as Parameters<typeof buildMarketingSnapshot>[0];
}

describe("buildMarketingSnapshot", () => {
  it("aggregates traffic, coverage, and opportunities into one snapshot", async () => {
    const sql = fakeSql({
      TRAFFIC_MARKER: [{ clicks_30d: 320, impresiones_30d: 5100, posicion_media: 18.4 }],
      COVERAGE_MARKER: [{ publicadas: 40, total: 55 }],
      FORMS_MARKER: [{ iniciados: 12, completados: 5 }],
      OPPS_MARKER: [
        { id: "1", tipo: "CREATE_PAGE", score: 82.5, estado: "PENDIENTE", fuente: "MOTOR" },
      ],
      SPARK_MARKER: [{ semana: 1, clicks: 10 }, { semana: 2, clicks: 20 }],
      SOCIAL_MARKER: [{ canal: "linkedin", posts: 6, alcance: 900 }],
    });

    const snapshot = await buildMarketingSnapshot(sql);

    expect(snapshot.clicks30d).toBe(320);
    expect(snapshot.paginasPublicadas).toBe(40);
    expect(snapshot.paginasTotal).toBe(55);
    expect(snapshot.oportunidadesPendientes).toBe(1);
    expect(snapshot.oportunidades[0].detectadaPorIa).toBe(true);
    expect(snapshot.redes[0].canal).toBe("linkedin");
    expect(snapshot.sparkClicks12Sem).toEqual([10, 20]);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- queries.test`
Expected: FAIL with "Cannot find module '../queries'"

- [ ] **Step 5: Implement `queries.ts`**

Note: the real SQL below targets the actual columns confirmed to exist (`seo.page_performance_daily`, `seo.pages`, `seo.form_conversions_daily`, `seo.opportunities`, `social.rendimiento_por_canal_y_categoria` — adjust exact column names in Step 6 if the live schema differs; this is why Step 6 requires running against real data before Task 6 wires the cron).

```ts
// src/modules/marketing/lib/queries.ts
import type postgres from "postgres";
import type { MarketingSnapshot, MarketingOportunidad, MarketingRedSocial } from "./types";

type Sql = ReturnType<typeof postgres>;

export async function buildMarketingSnapshot(sql: Sql): Promise<MarketingSnapshot> {
  const traffic = await sql`
    select
      coalesce(sum(clicks), 0)::int as clicks_30d,
      coalesce(sum(impressions), 0)::int as impresiones_30d,
      round(avg(position), 2) as posicion_media
    from seo.page_performance_daily
    where fecha >= current_date - interval '30 days'
  `;

  const coverage = await sql`
    select
      count(*) filter (where http_status between 200 and 299) as publicadas,
      count(*) as total
    from seo.pages
  `;

  const forms = await sql`
    select
      coalesce(sum(form_starts), 0)::int as iniciados,
      coalesce(sum(form_submits), 0)::int as completados
    from seo.form_conversions_daily
    where fecha >= current_date - interval '30 days'
  `;

  const opportunities = await sql`
    select id, tipo, score, estado, fuente
    from seo.opportunities
    where estado = 'PENDIENTE'
    order by score desc nulls last
    limit 25
  `;

  const spark = await sql`
    select
      date_trunc('week', fecha) as semana,
      sum(clicks)::int as clicks
    from seo.page_performance_daily
    where fecha >= current_date - interval '84 days'
    group by 1
    order by 1
  `;

  const social = await sql`
    select canal, count(*)::int as posts, coalesce(sum(alcance), 0)::int as alcance
    from social.rendimiento_por_canal_y_categoria
    group by canal
  `;

  return {
    fecha: new Date().toISOString().slice(0, 10),
    clicks30d: Number(traffic[0]?.clicks_30d ?? 0),
    impresiones30d: Number(traffic[0]?.impresiones_30d ?? 0),
    posicionMedia: traffic[0]?.posicion_media != null ? Number(traffic[0].posicion_media) : null,
    paginasPublicadas: Number(coverage[0]?.publicadas ?? 0),
    paginasTotal: Number(coverage[0]?.total ?? 0),
    formulariosIniciados30d: Number(forms[0]?.iniciados ?? 0),
    formulariosCompletados30d: Number(forms[0]?.completados ?? 0),
    oportunidadesPendientes: opportunities.length,
    sparkClicks12Sem: spark.map((row) => Number(row.clicks)),
    oportunidades: opportunities.map(
      (row): MarketingOportunidad => ({
        id: String(row.id),
        tipo: String(row.tipo),
        score: row.score != null ? Number(row.score) : null,
        estado: String(row.estado),
        detectadaPorIa: row.fuente === "MOTOR",
      })
    ),
    redes: social.map(
      (row): MarketingRedSocial => ({
        canal: String(row.canal),
        posts: Number(row.posts),
        alcance: Number(row.alcance),
      })
    ),
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- queries.test`
Expected: PASS (1 test)

- [ ] **Step 7: Verify the real SQL against the live read-only role before wiring the cron**

This step catches column-name mismatches against the real schema (the queries above use best-known column names from the earlier data inventory, but must be confirmed against live `information_schema` before Task 6 depends on them).

Run each query manually against the Supabase SQL Editor (read-only role, or an editor session) for `seo.page_performance_daily`, `seo.pages`, `seo.form_conversions_daily`, `seo.opportunities`, `social.rendimiento_por_canal_y_categoria`. If any column name differs from what Step 5 used, update `queries.ts` to match and re-run Step 6's test (the test doesn't hit the real DB, so it will still pass — this step is a manual reality-check, not blocked by the unit test).

- [ ] **Step 8: Commit**

```bash
git add src/modules/marketing db/001_dashboard_schema.sql
git commit -m "feat: add marketing snapshot aggregation query"
```

---

## Task 5: Ventas data module (Postgres + Google Sheets)

**Files:**
- Create: `src/modules/ventas/lib/queries.ts`
- Create: `src/modules/ventas/lib/sheets.ts`
- Create: `src/modules/ventas/lib/types.ts`
- Test: `src/modules/ventas/lib/__tests__/queries.test.ts`
- Test: `src/modules/ventas/lib/__tests__/sheets.test.ts`

- [ ] **Step 1: Write `types.ts`**

```ts
// src/modules/ventas/lib/types.ts
export type LlamadaVenta = {
  id: string;
  prospecto: string;
  resultado: string;
  resumen: string;
};

export type LeadProspeccion = {
  fuente: "linkedin" | "partners" | "subvenciones";
  empresa: string;
  estado: string;
  fecha: string;
};

export type VentasSnapshot = {
  fecha: string;
  llamadas7d: number;
  llamadasPositivas7d: number;
  llamadasRecientes: LlamadaVenta[];
  leadsNuevosSemana: number;
  pipelineProspeccion: LeadProspeccion[];
};
```

- [ ] **Step 2: Write the failing test for the Postgres side (llamadas)**

```ts
// src/modules/ventas/lib/__tests__/queries.test.ts
import { describe, expect, it, vi } from "vitest";
import { buildLlamadasSnapshot } from "../queries";

function fakeSql(rows: unknown[]) {
  return vi.fn(async () => rows) as unknown as Parameters<typeof buildLlamadasSnapshot>[0];
}

describe("buildLlamadasSnapshot", () => {
  it("counts total and positive calls from the last 7 days", async () => {
    const sql = fakeSql([
      { id: "1", prospecto: "ACME", resultado: "positivo", resumen: "Interesado" },
      { id: "2", prospecto: "Beta SL", resultado: "negativo", resumen: "No responde" },
      { id: "3", prospecto: "Gamma", resultado: "positivo", resumen: "Agenda demo" },
    ]);

    const result = await buildLlamadasSnapshot(sql);

    expect(result.llamadas7d).toBe(3);
    expect(result.llamadasPositivas7d).toBe(2);
    expect(result.llamadasRecientes).toHaveLength(3);
  });

  it("returns zeros when there are no calls", async () => {
    const sql = fakeSql([]);
    const result = await buildLlamadasSnapshot(sql);
    expect(result.llamadas7d).toBe(0);
    expect(result.llamadasPositivas7d).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- ventas/lib/__tests__/queries.test`
Expected: FAIL with "Cannot find module '../queries'"

- [ ] **Step 4: Implement the Postgres half of `queries.ts`**

```ts
// src/modules/ventas/lib/queries.ts
import type postgres from "postgres";
import type { LlamadaVenta } from "./types";

type Sql = ReturnType<typeof postgres>;

export async function buildLlamadasSnapshot(sql: Sql) {
  const rows = await sql`
    select id, prospecto, resultado, resumen
    from ventas.llamadas
    where creado_en >= now() - interval '7 days'
    order by creado_en desc
  `;

  const llamadasRecientes: LlamadaVenta[] = rows.map((row) => ({
    id: String(row.id),
    prospecto: String(row.prospecto),
    resultado: String(row.resultado),
    resumen: String(row.resumen ?? ""),
  }));

  return {
    llamadas7d: llamadasRecientes.length,
    llamadasPositivas7d: llamadasRecientes.filter((l) => l.resultado === "positivo").length,
    llamadasRecientes,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- ventas/lib/__tests__/queries.test`
Expected: PASS (2 tests)

- [ ] **Step 6: Verify the real column names for `ventas.llamadas` before Task 6**

The earlier data inventory reported columns `archivo_audio, drive_file_id, prospecto, resultado, resumen, objeciones, tareas, feedback_comunicacion, transcripcion` but did not confirm the timestamp column name. Run against the Supabase SQL Editor:
```sql
select column_name, data_type from information_schema.columns where table_schema = 'ventas' and table_name = 'llamadas';
```
Update the `creado_en` reference in Step 4 to match whatever the real timestamp column is called (common candidates: `creado_en`, `created_at`, `fecha`). Re-run Step 5's test after any change (it will still pass, since it's mocked — this step protects Task 6, not this test).

- [ ] **Step 7: Write the failing test for the Sheets-reading half**

```ts
// src/modules/ventas/lib/__tests__/sheets.test.ts
import { describe, expect, it, vi } from "vitest";
import { normalizeProspeccionRows } from "../sheets";

describe("normalizeProspeccionRows", () => {
  it("tags each row with its source and drops fully-empty rows", () => {
    const linkedin = [["Fecha", "Empresa", "Estado"], ["2026-09-20", "ACME", "Contactado"], []];
    const result = normalizeProspeccionRows({ linkedin, partners: [], subvenciones: [] });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ fuente: "linkedin", empresa: "ACME", estado: "Contactado" });
  });

  it("normalizes all three sources into one array", () => {
    const result = normalizeProspeccionRows({
      linkedin: [["Fecha", "Empresa", "Estado"], ["2026-09-20", "ACME", "Contactado"]],
      partners: [["Fecha", "Empresa", "Estado"], ["2026-09-19", "Beta SL", "Pendiente"]],
      subvenciones: [["Fecha", "Empresa", "Estado"], ["2026-09-18", "Gamma", "Aprobado"]],
    });

    expect(result.map((r) => r.fuente).sort()).toEqual(["linkedin", "partners", "subvenciones"]);
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npm test -- ventas/lib/__tests__/sheets.test`
Expected: FAIL with "Cannot find module '../sheets'"

- [ ] **Step 9: Implement `sheets.ts`**

The Sheets reading itself (`google.sheets({...}).spreadsheets.values.get`) is a thin wrapper that requires live credentials, so it is not unit tested directly — only the pure normalization function is. The `readSheetValues` function is exercised for real in Task 6's manual verification step.

```ts
// src/modules/ventas/lib/sheets.ts
import { google } from "googleapis";
import type { LeadProspeccion } from "./types";

const SHEET_IDS = {
  linkedin: "18dKDAmg...", // reemplazar con el ID real confirmado en Task 6 Step 3
  partners: "1hh8O5RK...",
  subvenciones: "10C0BWxK...",
} as const;

function getAuth() {
  const keyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64;
  if (!keyB64) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_B64 no está definida.");
  const credentials = JSON.parse(Buffer.from(keyB64, "base64").toString("utf8"));
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function readSheetValues(spreadsheetId: string, range: string): Promise<string[][]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (res.data.values as string[][]) ?? [];
}

export function normalizeProspeccionRows(input: {
  linkedin: string[][];
  partners: string[][];
  subvenciones: string[][];
}): LeadProspeccion[] {
  const parse = (rows: string[][], fuente: LeadProspeccion["fuente"]): LeadProspeccion[] =>
    rows
      .slice(1) // skip header row
      .filter((row) => row.length > 0 && row.some((cell) => cell?.trim()))
      .map((row) => ({
        fuente,
        fecha: row[0] ?? "",
        empresa: row[1] ?? "",
        estado: row[2] ?? "",
      }));

  return [
    ...parse(input.linkedin, "linkedin"),
    ...parse(input.partners, "partners"),
    ...parse(input.subvenciones, "subvenciones"),
  ];
}

export async function fetchProspeccionSnapshot(): Promise<LeadProspeccion[]> {
  const [linkedin, partners, subvenciones] = await Promise.all([
    readSheetValues(SHEET_IDS.linkedin, "A1:Z200"),
    readSheetValues(SHEET_IDS.partners, "A1:Z200"),
    readSheetValues(SHEET_IDS.subvenciones, "A1:Z200"),
  ]);
  return normalizeProspeccionRows({ linkedin, partners, subvenciones });
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npm test -- ventas/lib/__tests__/sheets.test`
Expected: PASS (2 tests)

- [ ] **Step 11: Commit**

```bash
git add src/modules/ventas
git commit -m "feat: add ventas snapshot aggregation (calls + prospecting sheets)"
```

---

## Task 6: Daily cron aggregation endpoint

**Files:**
- Create: `src/app/api/cron/sync/route.ts`
- Create: `vercel.json`
- Test: `src/app/api/cron/sync/__tests__/route.test.ts`

- [ ] **Step 1: Confirm the 3 real Google Sheet IDs**

Grep the n8n workflow definitions for the actual spreadsheet IDs referenced by `LI 01`, `PARTNER 01`, and `GRANTS 01/02/03` (the data inventory found three candidates: `18dKDAmg...`, `1hh8O5RK...`, `10C0BWxK...` but did not map which ID belongs to which source). Update the placeholders in `src/modules/ventas/lib/sheets.ts`'s `SHEET_IDS` constant with the confirmed real IDs and correct tab ranges (they may not all be `A1:Z200` — check each sheet's actual header row position, similar to the AUTONEST/BLOQBASE Sheets pattern seen elsewhere in this project where data starts at row 4 or 5, not row 1).

- [ ] **Step 2: Write the failing test for the cron route's auth check**

```ts
// src/app/api/cron/sync/__tests__/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/modules/marketing/lib/queries", () => ({
  buildMarketingSnapshot: vi.fn(async () => ({
    fecha: "2026-09-22",
    clicks30d: 0,
    impresiones30d: 0,
    posicionMedia: null,
    paginasPublicadas: 0,
    paginasTotal: 0,
    formulariosIniciados30d: 0,
    formulariosCompletados30d: 0,
    oportunidadesPendientes: 0,
    sparkClicks12Sem: [],
    oportunidades: [],
    redes: [],
  })),
}));
vi.mock("@/modules/ventas/lib/queries", () => ({
  buildLlamadasSnapshot: vi.fn(async () => ({ llamadas7d: 0, llamadasPositivas7d: 0, llamadasRecientes: [] })),
}));
vi.mock("@/modules/ventas/lib/sheets", () => ({
  fetchProspeccionSnapshot: vi.fn(async () => []),
}));
vi.mock("@/core/lib/db", () => ({
  getSql: vi.fn(() => vi.fn()),
}));

describe("GET /api/cron/sync", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without the correct authorization header", async () => {
    const { GET } = await import("../route");
    const request = new Request("http://localhost/api/cron/sync");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("accepts requests with the correct bearer token", async () => {
    const { GET } = await import("../route");
    const request = new Request("http://localhost/api/cron/sync", {
      headers: { authorization: "Bearer test-secret" },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- cron/sync/__tests__/route.test`
Expected: FAIL with "Cannot find module '../route'"

- [ ] **Step 4: Implement the cron route**

Following the design spec's error-isolation rule: each section (marketing, llamadas, prospección) is fetched independently, and a failure in one does not prevent the others from being written.

```ts
// src/app/api/cron/sync/route.ts
import { NextResponse } from "next/server";
import { getSql } from "@/core/lib/db";
import { buildMarketingSnapshot } from "@/modules/marketing/lib/queries";
import { buildLlamadasSnapshot } from "@/modules/ventas/lib/queries";
import { fetchProspeccionSnapshot } from "@/modules/ventas/lib/sheets";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sql = getSql();
  const today = new Date().toISOString().slice(0, 10);
  const results: Record<string, boolean> = {};

  try {
    const marketing = await buildMarketingSnapshot(sql);
    await sql`
      insert into dashboard.marketing_diario
        (fecha, clicks_30d, impresiones_30d, posicion_media, paginas_publicadas, paginas_total,
         formularios_iniciados_30d, formularios_completados_30d, oportunidades_pendientes,
         spark_clicks_12sem, oportunidades, redes)
      values
        (${today}, ${marketing.clicks30d}, ${marketing.impresiones30d}, ${marketing.posicionMedia},
         ${marketing.paginasPublicadas}, ${marketing.paginasTotal}, ${marketing.formulariosIniciados30d},
         ${marketing.formulariosCompletados30d}, ${marketing.oportunidadesPendientes},
         ${JSON.stringify(marketing.sparkClicks12Sem)}, ${JSON.stringify(marketing.oportunidades)},
         ${JSON.stringify(marketing.redes)})
      on conflict (fecha) do update set
        clicks_30d = excluded.clicks_30d,
        impresiones_30d = excluded.impresiones_30d,
        posicion_media = excluded.posicion_media,
        paginas_publicadas = excluded.paginas_publicadas,
        paginas_total = excluded.paginas_total,
        formularios_iniciados_30d = excluded.formularios_iniciados_30d,
        formularios_completados_30d = excluded.formularios_completados_30d,
        oportunidades_pendientes = excluded.oportunidades_pendientes,
        spark_clicks_12sem = excluded.spark_clicks_12sem,
        oportunidades = excluded.oportunidades,
        redes = excluded.redes,
        generado_en = now()
    `;
    await sql`insert into dashboard.sync_log (seccion, ok) values ('marketing', true)`;
    results.marketing = true;
  } catch (err) {
    console.error("[cron/sync] marketing failed", err);
    await sql`insert into dashboard.sync_log (seccion, ok, error) values ('marketing', false, ${String(err)})`;
    results.marketing = false;
  }

  try {
    const [llamadas, pipeline] = await Promise.all([
      buildLlamadasSnapshot(sql),
      fetchProspeccionSnapshot(),
    ]);
    await sql`
      insert into dashboard.ventas_diario
        (fecha, llamadas_7d, llamadas_positivas_7d, leads_nuevos_semana, llamadas_recientes, pipeline_prospeccion)
      values
        (${today}, ${llamadas.llamadas7d}, ${llamadas.llamadasPositivas7d}, ${pipeline.length},
         ${JSON.stringify(llamadas.llamadasRecientes)}, ${JSON.stringify(pipeline)})
      on conflict (fecha) do update set
        llamadas_7d = excluded.llamadas_7d,
        llamadas_positivas_7d = excluded.llamadas_positivas_7d,
        leads_nuevos_semana = excluded.leads_nuevos_semana,
        llamadas_recientes = excluded.llamadas_recientes,
        pipeline_prospeccion = excluded.pipeline_prospeccion,
        generado_en = now()
    `;
    await sql`insert into dashboard.sync_log (seccion, ok) values ('ventas', true)`;
    results.ventas = true;
  } catch (err) {
    console.error("[cron/sync] ventas failed", err);
    await sql`insert into dashboard.sync_log (seccion, ok, error) values ('ventas', false, ${String(err)})`;
    results.ventas = false;
  }

  return NextResponse.json({ ok: true, results });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- cron/sync/__tests__/route.test`
Expected: PASS (2 tests)

- [ ] **Step 6: Configure the Vercel Cron schedule**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 5 * * *"
    }
  ]
}
```

This runs at 05:00 UTC daily (early morning in Madrid time), before anyone in the team is likely to open the dashboard.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/cron vercel.json
git commit -m "feat: add daily cron endpoint that aggregates marketing and ventas data"
```

---

## Task 7: Apply the database migration to Supabase

**Files:**
- Modify: none (this is a manual DB operation, not a code change)

- [ ] **Step 1: Apply the migration**

Using the read-write credential available in this project's n8n instance (NOT the read-only `dashboard_bloqbase_ro` role, which cannot create schemas/tables), run the contents of `db/001_dashboard_schema.sql` against the `EXCELSIUS-CONSTRUYE` Supabase project (ref `neaspeveiwulaxcmhbqv`). The safest path already validated earlier in this project is: paste the SQL into the Supabase SQL Editor UI directly (Query tab, read-only toggle off), or use a temporary n8n workflow with the existing "Supabase - seo schema" Postgres credential (id `QRwQWjVYqx4sG5lI`) executing the migration, then delete the temporary workflow afterward — this exact pattern was used successfully earlier in this project for AUTONEST's schema and is documented in that project's history.

- [ ] **Step 2: Verify the schema was created**

Run against the database (read-only role is sufficient for this check once Step 3 grants it):
```sql
select table_name from information_schema.tables where table_schema = 'dashboard' order by 1;
```
Expected: `marketing_diario`, `sync_log`, `ventas_diario`.

- [ ] **Step 3: Grant the read-only role SELECT on the new schema**

The `dashboard_bloqbase_ro` role already has `select` on `seo`/`social`/`ventas` (created earlier in this project) but not yet on the new `dashboard` schema. Run:
```sql
grant usage on schema dashboard to dashboard_bloqbase_ro;
grant select on all tables in schema dashboard to dashboard_bloqbase_ro;
alter default privileges in schema dashboard grant select on tables to dashboard_bloqbase_ro;
```

- [ ] **Step 4: No commit needed — this task only touches the live database, not the repo.**

---

## Task 8: Supabase Auth login gate

**Files:**
- Create: `src/core/lib/supabase-server.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Create: `src/middleware.ts`
- Test: `src/app/login/__tests__/actions.test.ts`

Note: this Supabase Auth project is a **separate, new Supabase project** (or the auth-only piece of a project you control) — not the `EXCELSIUS-CONSTRUYE` data project. Auth users are unrelated to the `dashboard_bloqbase_ro` Postgres role. Create the project's users manually via the Supabase Auth dashboard (Users tab) once the project exists — there is no public sign-up flow per the design spec.

- [ ] **Step 1: Create a new Supabase project for auth (manual step, not code)**

Go to supabase.com, create a new project named `bloqbase-dashboard-auth` (or similar), and note its URL and anon key for `.env.local`. This is deliberately a different project than the data source, so a compromised dashboard auth token can never grant access to `seo.*`/`social.*`/`ventas.*` directly (the dashboard's own Postgres role is separate and read-only regardless).

- [ ] **Step 2: Write `supabase-server.ts`**

```ts
// src/core/lib/supabase-server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}
```

- [ ] **Step 3: Write the failing test for the login server action**

```ts
// src/app/login/__tests__/actions.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: vi.fn(async ({ email }: { email: string }) =>
        email === "valid@bloqbase.net"
          ? { data: { user: { id: "1" } }, error: null }
          : { data: { user: null }, error: { message: "Invalid credentials" } }
      ),
    },
  })),
}));

describe("login action", () => {
  it("returns an error message for invalid credentials", async () => {
    const { login } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "wrong@bloqbase.net");
    formData.set("password", "bad");
    const result = await login(formData);
    expect(result?.error).toBeDefined();
  });

  it("returns no error for valid credentials", async () => {
    const { login } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "valid@bloqbase.net");
    formData.set("password", "good");
    const result = await login(formData);
    expect(result?.error).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- login/__tests__/actions.test`
Expected: FAIL with "Cannot find module '../actions'"

- [ ] **Step 5: Implement `actions.ts`**

```ts
// src/app/login/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/core/lib/supabase-server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  redirect("/");
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- login/__tests__/actions.test`
Expected: PASS (2 tests)

- [ ] **Step 7: Write the login page**

```tsx
// src/app/login/page.tsx
import { login } from "./actions";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--lienzo)]">
      <form action={login} className="w-full max-w-[360px] rounded-[14px] border border-[color:var(--hairline)] bg-white p-[30px]">
        <div className="font-[var(--display)] text-[20px] font-bold tracking-[-0.02em]">
          Bloqbase — Panel ejecutivo
        </div>
        <div className="mt-[22px]">
          <label className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[rgba(26,26,24,0.58)]">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="mt-[8px] w-full border-b border-[color:var(--borde-input)] bg-transparent py-[10px] text-[15.5px] outline-none focus:border-[color:var(--naranja)]"
          />
        </div>
        <div className="mt-[22px]">
          <label className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[rgba(26,26,24,0.58)]">
            Contraseña
          </label>
          <input
            name="password"
            type="password"
            required
            className="mt-[8px] w-full border-b border-[color:var(--borde-input)] bg-transparent py-[10px] text-[15.5px] outline-none focus:border-[color:var(--naranja)]"
          />
        </div>
        <button
          type="submit"
          className="mt-[26px] w-full rounded-[10px] bg-[color:var(--naranja)] px-[22px] py-[14px] font-mono text-[11.5px] font-bold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--naranja-hover)]"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 8: Write `middleware.ts` to gate all routes except `/login`**

```ts
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 9: Commit**

```bash
git add src/core/lib/supabase-server.ts src/app/login src/middleware.ts
git commit -m "feat: add Supabase Auth login gate for all dashboard routes"
```

---

## Task 9: Resumen (home) page

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/modules/resumen/lib/read.ts`
- Test: `src/modules/resumen/lib/__tests__/read.test.ts`

- [ ] **Step 1: Write the failing test for reading today's snapshot with graceful fallback**

```ts
// src/modules/resumen/lib/__tests__/read.test.ts
import { describe, expect, it, vi } from "vitest";
import { readLatestSnapshots } from "../read";

describe("readLatestSnapshots", () => {
  it("returns both snapshots when both queries succeed", async () => {
    const sql = vi.fn(async (strings: TemplateStringsArray) => {
      if (strings.join("").includes("marketing_diario")) {
        return [{ clicks_30d: 100, oportunidades_pendientes: 3, oportunidades: "[]", redes: "[]", spark_clicks_12sem: "[]" }];
      }
      return [{ llamadas_7d: 5, llamadas_positivas_7d: 2, leads_nuevos_semana: 4, llamadas_recientes: "[]", pipeline_prospeccion: "[]" }];
    }) as unknown as Parameters<typeof readLatestSnapshots>[0];

    const result = await readLatestSnapshots(sql);

    expect(result.marketing?.clicks_30d).toBe(100);
    expect(result.ventas?.llamadas_7d).toBe(5);
  });

  it("returns null for a section whose query throws, without throwing itself", async () => {
    const sql = vi.fn(async (strings: TemplateStringsArray) => {
      if (strings.join("").includes("marketing_diario")) throw new Error("boom");
      return [{ llamadas_7d: 5, llamadas_positivas_7d: 2, leads_nuevos_semana: 4, llamadas_recientes: "[]", pipeline_prospeccion: "[]" }];
    }) as unknown as Parameters<typeof readLatestSnapshots>[0];

    const result = await readLatestSnapshots(sql);

    expect(result.marketing).toBeNull();
    expect(result.ventas?.llamadas_7d).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- resumen/lib/__tests__/read.test`
Expected: FAIL with "Cannot find module '../read'"

- [ ] **Step 3: Implement `read.ts`**

```ts
// src/modules/resumen/lib/read.ts
import type postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

export async function readLatestSnapshots(sql: Sql) {
  let marketing = null;
  let ventas = null;

  try {
    const rows = await sql`
      select * from dashboard.marketing_diario order by fecha desc limit 1
    `;
    marketing = rows[0] ?? null;
  } catch (err) {
    console.warn("[resumen] marketing_diario read failed", err);
  }

  try {
    const rows = await sql`
      select * from dashboard.ventas_diario order by fecha desc limit 1
    `;
    ventas = rows[0] ?? null;
  } catch (err) {
    console.warn("[resumen] ventas_diario read failed", err);
  }

  return { marketing, ventas };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- resumen/lib/__tests__/read.test`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement the Resumen page**

```tsx
// src/app/page.tsx
import { NavBar } from "@/core/components/NavBar";
import { MetricCard } from "@/core/components/MetricCard";
import { EmptyState } from "@/core/components/EmptyState";
import { Timeline } from "@/core/components/Timeline";
import { getSql } from "@/core/lib/db";
import { readLatestSnapshots } from "@/modules/resumen/lib/read";

export const dynamic = "force-dynamic";

export default async function ResumenPage() {
  const sql = getSql();
  const { marketing, ventas } = await readLatestSnapshots(sql);

  return (
    <div>
      <NavBar />
      <div className="mx-auto max-w-[1180px] px-[40px] py-[56px]">
        <div className="font-[var(--display)] text-[36px] font-bold tracking-[-0.03em]">
          Resumen
        </div>
        <div className="mt-[26px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Clicks orgánicos (30d)"
            value={marketing ? String(marketing.clicks_30d) : "—"}
          />
          <MetricCard
            label="Oportunidades SEO pendientes"
            value={marketing ? String(marketing.oportunidades_pendientes) : "—"}
          />
          <MetricCard
            label="Leads nuevos esta semana"
            value={ventas ? String(ventas.leads_nuevos_semana) : "—"}
          />
          <MetricCard
            label="Llamadas de venta (7d)"
            value={ventas ? String(ventas.llamadas_7d) : "—"}
            note={ventas ? `${ventas.llamadas_positivas_7d} con resultado positivo` : undefined}
          />
          <div className="rounded-[14px] border border-dashed border-[#D9D9D6] bg-white p-[22px_24px]">
            <EmptyState title="Producto" description="Llegará cuando exista acceso al repositorio del producto real." />
          </div>
          <div className="rounded-[14px] border border-dashed border-[#D9D9D6] bg-white p-[22px_24px]">
            <EmptyState title="Ingresos" description="Llegará cuando el webhook de Stripe persista suscripciones/pagos." />
          </div>
        </div>
        <div className="mt-[40px]">
          <div className="font-[var(--display)] text-[20px] font-semibold tracking-[-0.02em]">
            Actividad reciente
          </div>
          <Timeline items={[]} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify the app builds**

Run: `npm run build`
Expected: build succeeds (the page will fail to fetch real data without `DASHBOARD_DATABASE_URL` set locally — that's expected until Task 11's manual verification step).

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/modules/resumen
git commit -m "feat: add Resumen home page reading precomputed daily snapshots"
```

---

## Task 10: Marketing and Ventas detail pages

**Files:**
- Create: `src/app/marketing/page.tsx`
- Create: `src/app/ventas/page.tsx`

- [ ] **Step 1: Implement the Marketing page**

```tsx
// src/app/marketing/page.tsx
import { NavBar } from "@/core/components/NavBar";
import { MetricCard } from "@/core/components/MetricCard";
import { Badge, type BadgeStatus } from "@/core/components/Badge";
import { Table } from "@/core/components/Table";
import { getSql } from "@/core/lib/db";

export const dynamic = "force-dynamic";

type OportunidadRow = { id: string; tipo: string; score: number | null; estado: string; detectadaPorIa: boolean };

function toBadgeStatus(estado: string): BadgeStatus {
  const map: Record<string, BadgeStatus> = {
    PENDIENTE: "pendiente",
    APROBADA: "hecho",
    RECHAZADA: "archivado",
    EXPIRADA: "bloqueado",
  };
  return map[estado] ?? "pendiente";
}

export default async function MarketingPage() {
  const sql = getSql();
  const rows = await sql`select * from dashboard.marketing_diario order by fecha desc limit 1`;
  const snapshot = rows[0];
  const oportunidades: OportunidadRow[] = snapshot?.oportunidades ?? [];

  return (
    <div>
      <NavBar />
      <div className="mx-auto max-w-[1180px] px-[40px] py-[56px]">
        <div className="font-[var(--display)] text-[36px] font-bold tracking-[-0.03em]">Marketing</div>
        <div className="mt-[26px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Clicks (30d)" value={snapshot ? String(snapshot.clicks_30d) : "—"} />
          <MetricCard label="Impresiones (30d)" value={snapshot ? String(snapshot.impresiones_30d) : "—"} />
          <MetricCard
            label="Posición media"
            value={snapshot?.posicion_media != null ? String(snapshot.posicion_media) : "—"}
          />
          <MetricCard
            label="Páginas publicadas"
            value={snapshot ? `${snapshot.paginas_publicadas}/${snapshot.paginas_total}` : "—"}
          />
        </div>
        <div className="mt-[24px]">
          <Table<OportunidadRow>
            title="Oportunidades SEO pendientes"
            count={String(oportunidades.length).padStart(2, "0")}
            rowKey={(row) => row.id}
            columns={[
              { header: "Tipo", render: (row) => row.tipo },
              { header: "Score", align: "right", render: (row) => (row.score != null ? row.score.toFixed(1) : "—") },
              { header: "Estado", render: (row) => <Badge status={toBadgeStatus(row.estado)}>{row.estado}</Badge> },
            ]}
            rows={oportunidades}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement the Ventas page**

```tsx
// src/app/ventas/page.tsx
import { NavBar } from "@/core/components/NavBar";
import { MetricCard } from "@/core/components/MetricCard";
import { Badge, type BadgeStatus } from "@/core/components/Badge";
import { Table } from "@/core/components/Table";
import { getSql } from "@/core/lib/db";

export const dynamic = "force-dynamic";

type LlamadaRow = { id: string; prospecto: string; resultado: string; resumen: string };
type LeadRow = { fuente: string; empresa: string; estado: string; fecha: string };

function resultadoToBadge(resultado: string): BadgeStatus {
  return resultado === "positivo" ? "hecho" : "bloqueado";
}

export default async function VentasPage() {
  const sql = getSql();
  const rows = await sql`select * from dashboard.ventas_diario order by fecha desc limit 1`;
  const snapshot = rows[0];
  const llamadas: LlamadaRow[] = snapshot?.llamadas_recientes ?? [];
  const pipeline: LeadRow[] = snapshot?.pipeline_prospeccion ?? [];

  return (
    <div>
      <NavBar />
      <div className="mx-auto max-w-[1180px] px-[40px] py-[56px]">
        <div className="font-[var(--display)] text-[36px] font-bold tracking-[-0.03em]">Ventas</div>
        <div className="mt-[26px] grid grid-cols-1 gap-[16px] sm:grid-cols-3">
          <MetricCard label="Llamadas (7d)" value={snapshot ? String(snapshot.llamadas_7d) : "—"} />
          <MetricCard
            label="Resultado positivo"
            value={
              snapshot && snapshot.llamadas_7d > 0
                ? `${Math.round((snapshot.llamadas_positivas_7d / snapshot.llamadas_7d) * 100)}%`
                : "—"
            }
          />
          <MetricCard label="Leads nuevos (semana)" value={snapshot ? String(snapshot.leads_nuevos_semana) : "—"} />
        </div>
        <div className="mt-[24px]">
          <Table<LlamadaRow>
            title="Llamadas recientes"
            rowKey={(row) => row.id}
            columns={[
              { header: "Prospecto", render: (row) => row.prospecto },
              { header: "Resultado", render: (row) => <Badge status={resultadoToBadge(row.resultado)}>{row.resultado}</Badge> },
              { header: "Resumen", render: (row) => row.resumen },
            ]}
            rows={llamadas}
          />
        </div>
        <div className="mt-[24px]">
          <Table<LeadRow>
            title="Pipeline de prospección"
            rowKey={(row) => `${row.fuente}-${row.empresa}-${row.fecha}`}
            columns={[
              { header: "Fuente", render: (row) => row.fuente },
              { header: "Empresa", render: (row) => row.empresa },
              { header: "Estado", render: (row) => row.estado },
              { header: "Fecha", align: "right", render: (row) => row.fecha },
            ]}
            rows={pipeline}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the app builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/marketing src/app/ventas
git commit -m "feat: add Marketing and Ventas detail pages"
```

---

## Task 11: Deploy to Vercel and verify end-to-end

**Files:** none (deployment + manual verification)

- [ ] **Step 1: Create the Vercel project**

From `dashboard-bloqbase/`:
```bash
vercel link
```
Follow the prompts to create a new project named `dashboard-bloqbase` under the same Vercel team used by `bloqbase-web` and `dashboard-excelsius`.

- [ ] **Step 2: Set environment variables in Vercel**

Using `vercel env add` for each variable in `.env.example` (Production and Preview):
- `DASHBOARD_DATABASE_URL` — the pooler connection string from `docs/specs/supabase-connection.md`, with the real password.
- `GOOGLE_SERVICE_ACCOUNT_KEY_B64` — same value already used by AUTONEST's n8n credential (base64-encoded service account JSON); source it from that existing `.env`, do not create a new service account.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from the new auth-only Supabase project created in Task 8 Step 1.
- `CRON_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.

- [ ] **Step 3: Deploy**

```bash
vercel --prod
```
Expected: deployment succeeds, a production URL is printed.

- [ ] **Step 4: Manually trigger the cron endpoint once to populate `dashboard.*`**

```bash
curl -H "Authorization: Bearer <CRON_SECRET value>" https://<deployment-url>/api/cron/sync
```
Expected: `{"ok":true,"results":{"marketing":true,"ventas":true}}`. If either is `false`, check the Vercel function logs for the real error (likely a column-name mismatch caught late — go back and fix the query in `queries.ts`/`sheets.ts`, redeploy, retry).

- [ ] **Step 5: Create a user in the auth Supabase project**

In the Supabase Auth dashboard (Users tab) of the project created in Task 8 Step 1, manually invite/create at least one user with a real BLOQBASE team email, so there is a way to log in.

- [ ] **Step 6: Verify the full flow in a browser**

Open the production URL. Confirm:
- Unauthenticated access redirects to `/login`.
- Logging in with the created user redirects to `/` (Resumen).
- Resumen shows real numbers (not all `—`) for Marketing and Ventas, and shows the two "Próximamente" placeholders for Producto/Ingresos.
- `/marketing` shows the oportunidades table with real rows.
- `/ventas` shows real llamadas and pipeline rows.

- [ ] **Step 7: No commit needed for this task — record the production URL and the confirmed real Google Sheet IDs/column names discovered along the way in `docs/specs/supabase-connection.md` for future reference.**

```bash
git add docs/specs/supabase-connection.md
git commit -m "docs: record production deployment notes and confirmed schema details"
```

---

## Explicitly out of scope (per design spec)

- Role-based permissions.
- Any write path back into `seo.*`/`social.*`/`ventas.*` or the Google Sheets.
- Migrating the 3 prospecting Sheets into Postgres.
- Producto and Ingresos sections with real data (Stripe persistence, product analytics) — both remain `EmptyState` placeholders until those data sources exist.
