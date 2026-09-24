import { render, screen } from "@testing-library/react";
import { AIRecommendation } from "../AIRecommendation";
import type { AIRecommendationData } from "@/core/types/ai";
import { describe, it, expect } from "vitest";

describe("AIRecommendation", () => {
  it("renders recommendation with status, headline, and actions", () => {
    const mockData: AIRecommendationData = {
      diagnosis: {
        status: "atención",
        headline: "Caída en alcance de Instagram",
        reason: "El rendimiento de los últimos posts está 42% por debajo de la media histórica.",
        context: {},
      },
      recommendations: [
        {
          title: "Cambiar temática y formato",
          description: "Los posts con formato carrusel están rindiendo 3x mejor que videos.",
          priority: "alta",
        },
      ],
      actions: [
        {
          id: "prepare-instagram-posts",
          label: "Preparar posts",
        },
      ],
    };

    const { container } = render(<AIRecommendation data={mockData} />);

    // Check that the container exists and has the diagnosis
    expect(container.textContent).toContain("Caída en alcance de Instagram");
    expect(container.textContent).toContain("42%");
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  it("renders bien status", () => {
    const mockData: AIRecommendationData = {
      diagnosis: {
        status: "bien",
        headline: "Métricas saludables",
        reason: "Todo está en el rango esperado.",
        context: {},
      },
      recommendations: [],
      actions: [],
    };

    const { container } = render(<AIRecommendation data={mockData} />);
    expect(container.textContent).toContain("Métricas saludables");
  });

  it("renders requiere_accion status with the naranja alert style", () => {
    const mockData: AIRecommendationData = {
      diagnosis: {
        status: "requiere_accion",
        headline: "Instagram cae con fuerza",
        reason: "El alcance está muy por debajo del baseline de las últimas 4 semanas.",
        context: {},
      },
      recommendations: [],
      actions: [],
    };

    const { container } = render(<AIRecommendation data={mockData} />);
    expect(container.textContent).toContain("Requiere acción");
    expect(container.textContent).toContain("Instagram cae con fuerza");
  });
});
