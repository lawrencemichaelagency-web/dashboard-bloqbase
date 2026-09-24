import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs } from "../Tabs";

describe("Tabs", () => {
  const items = [
    { key: "resumen", label: "Resumen" },
    { key: "web", label: "Web", count: 25 },
    { key: "ads", label: "Ads", disabled: true, disabledLabel: "No conectado" },
  ];

  it("marks the active tab with bq-tab-active", () => {
    const { container } = render(<Tabs items={items} activeKey="web" basePath="/marketing" />);
    const activeLink = container.querySelector(".bq-tab-active");
    expect(activeLink?.textContent).toContain("Web");
  });

  it("renders disabled tabs as span, not as a link", () => {
    const { container } = render(<Tabs items={items} activeKey="resumen" basePath="/marketing" />);
    const disabledTab = container.querySelector(".bq-tab-disabled");
    expect(disabledTab?.tagName).toBe("SPAN");
    expect(disabledTab?.textContent).toContain("No conectado");
  });

  it("shows count only when defined", () => {
    const { container } = render(<Tabs items={items} activeKey="resumen" basePath="/marketing" />);
    expect(within(container).getByText("25")).toBeInTheDocument();
  });

  it("builds hrefs with the tab key as a query param", () => {
    const { container } = render(<Tabs items={items} activeKey="resumen" basePath="/marketing" />);
    const links = container.querySelectorAll("a");
    const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/marketing?tab=resumen");
    expect(hrefs).toContain("/marketing?tab=web");
  });
});
