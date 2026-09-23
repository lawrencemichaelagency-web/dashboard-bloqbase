"use client";

import { AIRecommendation } from "@/core/components/AIRecommendation";
import { executeMarketingAction } from "@/modules/marketing/lib/actions";
import type { AIRecommendationData } from "@/core/types/ai";
import { useState } from "react";

interface MarketingAIRecommendationProps {
  data: AIRecommendationData;
}

export function MarketingAIRecommendation({ data }: MarketingAIRecommendationProps) {
  const [pending, setPending] = useState<string | null>(null);

  async function handleAction(actionId: string) {
    setPending(actionId);
    try {
      await executeMarketingAction(actionId);
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
