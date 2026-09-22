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
