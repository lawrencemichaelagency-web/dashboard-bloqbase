# Dashboard AI 80/20 Engine

## Overview

El motor de IA del dashboard identifica automáticamente el cuello de botella principal en cada módulo (Marketing, Ventas) y propone 1-3 acciones prioritarias basadas en datos.

## Architecture

### Core Components

**AI Engine** (`src/core/lib/ai-engine.ts`)
- Funciones genéricas de análisis: `detectTrend()`, `compareToBaseline()`, `findBottleneck()`
- Usado por analizadores específicos de cada módulo

**Module Analyzers**
- `src/modules/marketing/lib/ai-analyzer.ts` — Detecta oportunidades SEO, tasa de conversión baja, etc.
- `src/modules/ventas/lib/ai-analyzer.ts` — Detecta baja tasa de positivas, bajo volumen, etc.

**AIRecommendation Component** (`src/core/components/AIRecommendation.tsx`)
- Renderiza diagnóstico, recomendaciones y botones de acción
- Estilo consistente en todos los módulos

### Data Flow

1. Página llama a `buildSnapshot()` (ej: `buildMarketingSnapshot()`)
2. `buildSnapshot()` recopila datos y llama a su analizador (ej: `analyzeMarketingData()`)
3. Analizador retorna `AIRecommendationData` con diagnóstico + recomendaciones
4. Página renderiza `<AIRecommendation data={snapshot.aiAnalysis} />`
5. Usuario hace click en botón → Server Action se ejecuta

## Module-Specific Rules

### Marketing AI Analyzer

**Señales que monitorea:**
- Tasa de conversión de formularios (debe estar > 20%)
- Oportunidades SEO pendientes con alto score (> 5 es alerta)
- Cobertura de páginas (debe estar > 80%)

**Acciones que propone:**
- Priorizar oportunidad SEO específica
- Optimizar CTA del formulario
- Publicar páginas en borrador

### Ventas AI Analyzer

**Señales que monitorea:**
- Tasa de resultado positivo (debe estar > 35%)
- Volumen de llamadas (debe ser > 5 por semana)
- Llamadas sin clasificar

**Acciones que propone:**
- Revisar guión de presentación
- Aumentar volumen de llamadas
- Clasificar llamadas sin resultado

## Adding New Analysis Rules

Para agregar una nueva regla de análisis en Marketing:

1. Abre `src/modules/marketing/lib/ai-analyzer.ts`
2. En `analyzeMarketingData()`, agrega una nueva "Regla N" antes del return
3. Ejemplo:

```typescript
// Regla 5: Si el CTR es muy bajo
const avgCTR = snapshot.clicks30d / snapshot.impresiones30d;
if (avgCTR < 0.01) { // Menos del 1%
  status = "atención";
  recommendations.push({
    title: "Mejorar los títulos y meta descriptions",
    description: "Un CTR bajo indica que los usuarios no ven tus resultados como relevantes.",
    priority: "alta",
  });
}
```

4. Corre tests: `npm run test -- modules/marketing/lib/__tests__/ai-analyzer.test.ts`
5. Commit: `git commit -m "feat(marketing): add rule for low CTR detection"`

## Testing

Cada analizador tiene tests unitarios en `__tests__/ai-analyzer.test.ts`. Corren con:

```bash
npm run test -- modules/*/lib/__tests__/ai-analyzer.test.ts
```

Tests siguen patrón arrange-act-assert y usan mocks de datos simples.

## Future Enhancements

- [ ] Integración con Claude API para recomendaciones con lenguaje natural
- [ ] Históricos y tendencias para baselines dinámicos
- [ ] Webhooks para ejecutar acciones automáticamente en n8n
- [ ] Alerts configurables (email, Slack, SMS)
- [ ] A/B testing de recomendaciones (cuál genera más engagement)
- [ ] Análisis de embudos de conversión multi-etapa
