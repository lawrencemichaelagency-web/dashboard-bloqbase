"use client";

import { AIRecommendation } from "@/core/components/AIRecommendation";
import { executeVentasAction } from "@/modules/ventas/lib/actions";
import type { AIRecommendationData } from "@/core/types/ai";
import { useState } from "react";

interface VentasAIRecommendationProps {
  data: AIRecommendationData;
}

export function VentasAIRecommendation({ data }: VentasAIRecommendationProps) {
  const [pending, setPending] = useState<string | null>(null);

  async function handleAction(actionId: string) {
    setPending(actionId);
    try {
      await executeVentasAction(actionId);
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setPending(null);
    }
  }

  return (
    <AIRecommendation
      data={{
        ...data,
        actions: data.actions.map((a) => ({
          ...a,
          isPending: pending === a.id,
        })),
      }}
      onAction={handleAction}
    />
  );
}
