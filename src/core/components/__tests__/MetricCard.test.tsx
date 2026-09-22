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
