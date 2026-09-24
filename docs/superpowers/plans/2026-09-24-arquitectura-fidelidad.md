# Fidelidad al Documento de Arquitectura Implementation Plan

> **Para trabajadores agénticos:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans para implementar este plan tarea a tarea. Los pasos usan checkbox (`- [ ]`) para tracking.

**Goal:** Cerrar las 5 brechas identificadas entre el dashboard actual y `Bloqbase_Dashboard_Interno_Arquitectura_v1.md`: la regla "Sin suficiente señal", comparación contra baseline real (no umbrales inventados), vocabulario de estados correcto por sección, separación de Growth en sus 5 submódulos reales (Web, Redes, Newsletter, Cold Email, Ads), y el pipeline de Ventas de 6 etapas con bloqueos y prioridades de hoy.

**Architecture:**
- El motor de IA (`ai-engine.ts`) gana una función `hasSufficientSignal()` que todo analizador debe consultar antes de diagnosticar.
- Cada analizador deja de comparar contra umbrales fijos (`< 0.35`, `< 5`) y empieza a comparar contra un baseline histórico real que cada `buildSnapshot()` calcula desde la propia base de datos (media de las 4 semanas previas).
- `DiagnosisStatus` se parametriza por vocabulario de sección: el tipo pasa a incluir `"requiere_accion"` como alias válido, y cada dashboard de canal usa "Bien / Atención / Requiere acción" mientras que Inicio y el patrón general siguen usando "Bien / Atención / Crítico", tal como el documento describe en las secciones 2, 5, 9–13.
- Marketing dejará de ser un único analizador genérico: se divide en `growth/web`, `growth/redes`, `growth/newsletter`, `growth/cold-email`, `growth/ads`, cada uno con su propio analizador y vista, más un resumen de Growth que solo compara canales (sección 3).
- Ventas gana un pipeline explícito de 6 etapas, detección de bloqueos (sin movimiento > 7 días) y una lista de "Prioridades de hoy" (máx. 5), sustituyendo el análisis exclusivo sobre llamadas.

**Tech Stack:** Next.js 15 App Router, TypeScript, Vitest, Postgres (vía `postgres` package), mismo patrón `buildXSnapshot()` → `analyzeXData()` → página ya establecido.

---

## Alcance y orden

Este plan tiene 6 bloques de trabajo, en este orden porque cada uno depende del anterior:

1. **Motor de señal suficiente** (bloquea todo lo demás — sin esto, cualquier baseline nuevo también podría "inventar" diagnósticos)
2. **Baseline real en el motor de IA**
3. **Vocabulario de estados por sección**
4. **Aplicar señal suficiente + baseline a Marketing y Ventas existentes** (fix inmediato de las 2 brechas más graves, sobre el código ya en producción)
5. **Separar Growth en 5 submódulos** (Web, Redes, Newsletter, Cold Email, Ads)
6. **Pipeline de Ventas de 6 etapas + bloqueos + prioridades de hoy**

Los bloques 5 y 6 son grandes reestructuraciones de UI; se ejecutan al final para no bloquear los fixes de lógica que son más urgentes y de menor riesgo.

---

## Bloque 1: Motor de señal suficiente

### Task 1: `hasSufficientSignal()` en el motor de IA

**Files:**
- Modify: `src/core/lib/ai-engine.ts`
- Modify: `src/core/types/ai.ts`
- Test: `src/core/lib/__tests__/ai-engine.test.ts`

- [ ] **Step 1: Añadir el tipo de resultado "sin señal" a `ai.ts`**

En `src/core/types/ai.ts`, después de la línea 1 (`export type DiagnosisStatus = ...`), añade:

```typescript
export type DiagnosisStatus = "bien" | "atención" | "crítico" | "requiere_accion";

export const SIN_SUFICIENTE_SENAL: Diagnosis = {
  status: "bien",
  headline: "Sin suficiente señal",
  reason: "Todavía no hay volumen de datos suficiente para diagnosticar con confianza. Evitamos inventar una recomendación.",
  context: { sinSenal: true },
};
```

Nota: `SIN_SUFICIENTE_SENAL` debe declararse **después** de la interfaz `Diagnosis` (que ya existe más abajo en el archivo), así que colócalo al final del archivo, no arriba. El archivo completo queda así:

```typescript
export type DiagnosisStatus = "bien" | "atención" | "crítico" | "requiere_accion";

export interface Diagnosis {
  status: DiagnosisStatus;
  headline: string; // Una frase corta resumiendo el estado
  reason: string; // Por qué está así (datos que sustentan)
  context: Record<string, unknown>; // Datos contextuales para la recomendación
}

export interface Recommendation {
  title: string; // Acción específica y concreta
  description: string; // Una o dos frases explicando por qué
  priority: "alta" | "media" | "baja";
  metrics?: {
    label: string;
    current: string | number;
    expected?: string | number;
    delta?: string;
  }[]; // Métricas que sustentan la recomendación
}

export interface Action {
  id: string; // "marketing-increase-seo-budget", "ventas-reactivate-cold"
  label: string; // "Ejecutar"
  description?: string; // Hint sobre qué hace
  disabled?: boolean;
  isPending?: boolean;
}

export interface AIRecommendationData {
  diagnosis: Diagnosis;
  recommendations: Recommendation[]; // Máximo 3
  actions: Action[];
}

export const SIN_SUFICIENTE_SENAL: AIRecommendationData = {
  diagnosis: {
    status: "bien",
    headline: "Sin suficiente señal",
    reason: "Todavía no hay volumen de datos suficiente para diagnosticar con confianza. Evitamos inventar una recomendación.",
    context: { sinSenal: true },
  },
  recommendations: [],
  actions: [],
};
```

(Se cambió el tipo de `SIN_SUFICIENTE_SENAL` de `Diagnosis` a `AIRecommendationData` porque eso es lo que cada `analyze*Data()` debe retornar directamente cuando no hay señal — no solo el diagnóstico.)

- [ ] **Step 2: Escribir el test de `hasSufficientSignal()` (debe fallar primero)**

En `src/core/lib/__tests__/ai-engine.test.ts`, añade un nuevo `describe` al final del archivo (antes del último `});`):

```typescript
import { detectTrend, compareToBaseline, findBottleneck, hasSufficientSignal } from "../ai-engine";
```

Reemplaza esa línea de import (la primera del archivo) para incluir `hasSufficientSignal`, y añade este bloque al final del archivo, antes del cierre final:

```typescript
  describe("hasSufficientSignal", () => {
    it("returns false when sample size is zero", () => {
      expect(hasSufficientSignal(0, 5)).toBe(false);
    });

    it("returns false when sample size is below the minimum", () => {
      expect(hasSufficientSignal(3, 5)).toBe(false);
    });

    it("returns true when sample size meets the minimum", () => {
      expect(hasSufficientSignal(5, 5)).toBe(true);
    });

    it("returns true when sample size exceeds the minimum", () => {
      expect(hasSufficientSignal(20, 5)).toBe(true);
    });

    it("defaults the minimum to 5 when not provided", () => {
      expect(hasSufficientSignal(4)).toBe(false);
      expect(hasSufficientSignal(5)).toBe(true);
    });
  });
```

- [ ] **Step 2b: Ejecutar el test para confirmar que falla**

```bash
cd "C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase"
npm run test -- src/core/lib/__tests__/ai-engine.test.ts
```

Esperado: FALLA con `hasSufficientSignal is not a function` o similar (import roto).

- [ ] **Step 3: Implementar `hasSufficientSignal()` en `ai-engine.ts`**

Añade al final de `src/core/lib/ai-engine.ts`:

```typescript
/**
 * Regla anti-error del documento de arquitectura (secciones 9.3, 10.3, 11.3,
 * 12.3, 13.4): nunca declarar un diagnóstico o recomendación sin un mínimo
 * de volumen de datos. Con muestras pequeñas, el analizador debe devolver
 * SIN_SUFICIENTE_SENAL en vez de inventar una lectura.
 */
export function hasSufficientSignal(sampleSize: number, minimum = 5): boolean {
  return sampleSize >= minimum;
}
```

- [ ] **Step 4: Ejecutar el test para confirmar que pasa**

```bash
npm run test -- src/core/lib/__tests__/ai-engine.test.ts
```

Esperado: 12 tests pasan (7 anteriores + 5 nuevos).

- [ ] **Step 5: Commit**

```bash
git add src/core/lib/ai-engine.ts src/core/types/ai.ts src/core/lib/__tests__/ai-engine.test.ts
git commit -m "feat(core): add hasSufficientSignal guard and SIN_SUFICIENTE_SENAL constant

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Bloque 2: Baseline real en el motor de IA

### Task 2: `compareToHistoricalBaseline()` — reemplaza los umbrales fijos

**Files:**
- Modify: `src/core/lib/ai-engine.ts`
- Test: `src/core/lib/__tests__/ai-engine.test.ts`

El documento exige (secciones 9.3, 10.3): *"Comparar cada red/canal contra su propio baseline, no contra umbrales genéricos."* Esta función calcula si un valor actual se desvía significativamente de una serie histórica, en vez de compararlo contra un número que el desarrollador inventó.

- [ ] **Step 1: Escribir el test (debe fallar primero)**

Añade a `src/core/lib/__tests__/ai-engine.test.ts`, actualiza el import de la primera línea:

```typescript
import { detectTrend, compareToBaseline, findBottleneck, hasSufficientSignal, compareToHistoricalBaseline } from "../ai-engine";
```

Y añade este `describe` al final del archivo:

```typescript
  describe("compareToHistoricalBaseline", () => {
    it("flags a significant drop below the historical average", () => {
      const historial = [100, 105, 98, 102]; // media = 101.25
      const result = compareToHistoricalBaseline(60, historial);
      expect(result.status).toBe("down");
      expect(result.baseline).toBeCloseTo(101.25, 1);
      expect(result.deltaPercent).toBeGreaterThan(20);
    });

    it("flags a significant rise above the historical average", () => {
      const historial = [100, 100, 100, 100];
      const result = compareToHistoricalBaseline(150, historial);
      expect(result.status).toBe("up");
    });

    it("treats small deviations as stable", () => {
      const historial = [100, 102, 98, 100];
      const result = compareToHistoricalBaseline(103, historial);
      expect(result.status).toBe("stable");
    });

    it("returns insufficient signal when historial has fewer than 3 points", () => {
      const result = compareToHistoricalBaseline(50, [100, 90]);
      expect(result.status).toBe("insufficient_data");
    });
  });
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npm run test -- src/core/lib/__tests__/ai-engine.test.ts
```

Esperado: FALLA, `compareToHistoricalBaseline is not a function`.

- [ ] **Step 3: Implementar en `ai-engine.ts`**

Añade al final de `src/core/lib/ai-engine.ts`:

```typescript
export interface HistoricalComparison {
  status: "up" | "down" | "stable" | "insufficient_data";
  baseline: number;
  deltaPercent: number;
}

/**
 * Compara un valor actual contra la media de una serie histórica (p.ej. las
 * últimas 4-12 semanas), en vez de un umbral fijo inventado. Requiere al
 * menos 3 puntos históricos para considerar la comparación válida — con
 * menos, el análisis se declara "insufficient_data" y el analizador que
 * llama a esta función debe tratarlo como señal insuficiente.
 */
export function compareToHistoricalBaseline(
  current: number,
  historial: number[]
): HistoricalComparison {
  if (historial.length < 3) {
    return { status: "insufficient_data", baseline: 0, deltaPercent: 0 };
  }

  const baseline = historial.reduce((a, b) => a + b, 0) / historial.length;

  if (baseline === 0) {
    return { status: current > 0 ? "up" : "stable", baseline: 0, deltaPercent: 0 };
  }

  const deltaPercent = ((current - baseline) / baseline) * 100;

  if (Math.abs(deltaPercent) < 15) {
    return { status: "stable", baseline, deltaPercent: Math.abs(deltaPercent) };
  }

  return {
    status: deltaPercent > 0 ? "up" : "down",
    baseline,
    deltaPercent: Math.abs(deltaPercent),
  };
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npm run test -- src/core/lib/__tests__/ai-engine.test.ts
```

Esperado: 16 tests pasan (12 anteriores + 4 nuevos).

- [ ] **Step 5: Commit**

```bash
git add src/core/lib/ai-engine.ts src/core/lib/__tests__/ai-engine.test.ts
git commit -m "feat(core): add compareToHistoricalBaseline to replace fixed thresholds

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Bloque 3: Vocabulario de estados por sección

El documento usa dos vocabularios distintos según sección:
- **Patrón general e Inicio** (secciones 2, 5): "Bien / Atención / Crítico"
- **Todos los dashboards de canal** (secciones 9, 10, 11, 12, 13): "Bien / Atención / Requiere acción"

`DiagnosisStatus` ya incluye `"requiere_accion"` desde el Bloque 1. Ahora hay que usarlo donde corresponde y actualizar `AIRecommendation.tsx` para etiquetarlo bien.

### Task 3: Etiqueta de "Requiere acción" en el componente visual

**Files:**
- Modify: `src/core/components/AIRecommendation.tsx`
- Test: `src/core/components/__tests__/AIRecommendation.test.tsx`

- [ ] **Step 1: Escribir el test (debe fallar primero)**

Añade a `src/core/components/__tests__/AIRecommendation.test.tsx`, un nuevo `it` dentro del `describe` existente:

```typescript
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
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npm run test -- src/core/components/__tests__/AIRecommendation.test.tsx
```

Esperado: FALLA — `ALERT_STYLE[data.diagnosis.status]` es `undefined` porque `"requiere_accion"` no está en el mapeo, y el componente revienta al leer `style.bar`.

- [ ] **Step 3: Añadir la entrada al mapeo en `AIRecommendation.tsx`**

En `src/core/components/AIRecommendation.tsx`, localiza la constante `ALERT_STYLE` y reemplázala:

```typescript
const ALERT_STYLE: Record<DiagnosisStatus, { bar: string; tagColor: string; tagBg: string; label: string }> = {
  bien: { bar: "var(--teal)", tagColor: "var(--teal-texto)", tagBg: "rgba(22,160,133,.1)", label: "Bien" },
  atención: { bar: "var(--amarillo)", tagColor: "var(--amarillo-texto)", tagBg: "rgba(245,183,0,.14)", label: "Atención" },
  crítico: { bar: "var(--naranja)", tagColor: "var(--naranja-texto)", tagBg: "rgba(255,44,0,.09)", label: "Crítico" },
  requiere_accion: { bar: "var(--naranja)", tagColor: "var(--naranja-texto)", tagBg: "rgba(255,44,0,.09)", label: "Requiere acción" },
};
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npm run test -- src/core/components/__tests__/AIRecommendation.test.tsx
```

Esperado: 3 tests pasan (2 anteriores + 1 nuevo).

- [ ] **Step 5: Commit**

```bash
git add src/core/components/AIRecommendation.tsx src/core/components/__tests__/AIRecommendation.test.tsx
git commit -m "feat(core): support requiere_accion diagnosis status in AIRecommendation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Bloque 4: Aplicar señal suficiente + baseline a Marketing y Ventas existentes

Este bloque corrige el código ya en producción (`ai-analyzer.ts` de ambos módulos) para que use `hasSufficientSignal()` en vez de generar diagnósticos con datos insuficientes, y `compareToHistoricalBaseline()` en vez de umbrales fijos.

### Task 4: Ventas — aplicar `hasSufficientSignal()` (fix de la brecha más grave)

**Files:**
- Modify: `src/modules/ventas/lib/ai-analyzer.ts`
- Test: `src/modules/ventas/lib/__tests__/ai-analyzer.test.ts`

- [ ] **Step 1: Escribir el test que reproduce el bug (debe fallar primero)**

En `src/modules/ventas/lib/__tests__/ai-analyzer.test.ts`, añade un nuevo `it` dentro del `describe` existente:

```typescript
  it("returns 'sin suficiente señal' when there is zero call volume", () => {
    const emptySnapshot: VentasSnapshot = {
      llamadas7d: 0,
      llamadasPositivas7d: 0,
      llamadasRecientes: [],
      leadsNuevosSemana: 0,
      pipelineProspeccion: [],
      fecha: new Date(),
    };
    const result = analyzeLlamadasData(emptySnapshot);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
    expect(result.recommendations).toHaveLength(0);
  });
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npm run test -- src/modules/ventas/lib/__tests__/ai-analyzer.test.ts
```

Esperado: FALLA — con `llamadas7d: 0`, el código actual entra en la rama "Bajo volumen" (`lowVolume = snapshot.llamadas7d < 5`) y genera headline `"Solo 0 llamadas esta semana"` en vez de `"Sin suficiente señal"`.

- [ ] **Step 3: Añadir el guard al inicio de `analyzeLlamadasData()`**

En `src/modules/ventas/lib/ai-analyzer.ts`, importa el guard y la constante, y añade la comprobación al principio de la función:

```typescript
import type { VentasSnapshot } from "./types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { hasSufficientSignal } from "@/core/lib/ai-engine";

export function analyzeLlamadasData(snapshot: VentasSnapshot): AIRecommendationData {
  // Regla anti-error (documento sección 13.4): con muy pocas llamadas no
  // hay evidencia suficiente para diagnosticar tasa de positivas ni volumen.
  // El mínimo de 5 es el mismo umbral que "bajo volumen" ya usaba, así que
  // no perdemos cobertura: por debajo de 5, siempre era una lectura débil.
  if (!hasSufficientSignal(snapshot.llamadas7d, 5)) {
    return SIN_SUFICIENTE_SENAL;
  }

  const recommendations: Recommendation[] = [];
```

- [ ] **Step 4: Eliminar la Regla 2 (bajo volumen), que ahora es inalcanzable**

Como el guard ya intercepta `llamadas7d < 5` al inicio de la función, la "Regla 2: Bajo volumen" original (que comprobaba `lowVolume = snapshot.llamadas7d < 5`) nunca se ejecutará — es código muerto. Búscala y elimínala completa:

```typescript
  // Regla 2: Bajo volumen
  if (lowVolume) {
    status = status === "bien" ? "atención" : status;
    headline = `Solo ${snapshot.llamadas7d} llamadas esta semana`;
    reason = `El volumen de llamadas está muy por debajo de lo necesario para generar oportunidades comerciales de forma sostenible.`;

    recommendations.push({
      title: "Aumentar volumen de llamadas",
      description:
        "Menos de 5 llamadas por semana es insuficiente para generar oportunidades. Necesitas al menos 10-15.",
      priority: "alta",
      metrics: [
        {
          label: "Llamadas (7d)",
          current: snapshot.llamadas7d,
          expected: "15",
        },
      ],
    });
  }
```

Y elimina también la declaración `const lowVolume = snapshot.llamadas7d < 5;` más arriba en la función, que ya no se usa.

El archivo completo `analyzeLlamadasData` queda así tras los cambios:

```typescript
import type { VentasSnapshot } from "./types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { hasSufficientSignal } from "@/core/lib/ai-engine";

export function analyzeLlamadasData(snapshot: VentasSnapshot): AIRecommendationData {
  // Regla anti-error (documento sección 13.4): con muy pocas llamadas no
  // hay evidencia suficiente para diagnosticar tasa de positivas ni volumen.
  if (!hasSufficientSignal(snapshot.llamadas7d, 5)) {
    return SIN_SUFICIENTE_SENAL;
  }

  const recommendations: Recommendation[] = [];

  const positiveRate =
    snapshot.llamadas7d > 0 ? snapshot.llamadasPositivas7d / snapshot.llamadas7d : 0;

  // Señal 1: Tasa de resultado positivo
  const lowPositiveRate = positiveRate < 0.35; // Menos del 35% es bajo

  // Señal 2: Análisis de llamadas sin resultado definido
  const sinResultado = snapshot.llamadasRecientes.filter(
    (l) => l.resultado === "SIN_RESULTADO"
  ).length;

  let status: "bien" | "atención" | "crítico" = "bien";
  let headline = "Pipeline de ventas saludable";
  let reason = "Está manteniendo el ritmo esperado de llamadas y conversiones.";

  // Regla 1: Baja tasa de positivas
  if (lowPositiveRate && snapshot.llamadas7d > 0) {
    status = "atención";
    headline = `Tasa de positivas baja: ${(positiveRate * 100).toFixed(0)}%`;
    reason = `De las ${snapshot.llamadas7d} llamadas, solo ${snapshot.llamadasPositivas7d} fueron positivas. El embudo tiene mucho rechazo temprano.`;

    recommendations.push({
      title: "Revisar el guión de presentación",
      description:
        "Si muchas llamadas terminan en NO_INTERESADO sin discusión real, el problema está en los primeros 60 segundos.",
      priority: "alta",
      metrics: [
        {
          label: "Tasa positiva",
          current: `${(positiveRate * 100).toFixed(0)}%`,
          expected: "35-50%",
        },
      ],
    });
  }

  // Regla 2: Llamadas sin resultado
  if (sinResultado > 0) {
    recommendations.push({
      title: `Clasificar ${sinResultado} llamada${sinResultado > 1 ? "s" : ""} sin resultado`,
      description:
        "Completar el registro de estas llamadas ayuda a entender mejor el pipeline.",
      priority: "media",
    });
  }

  // Regla 3: Genérica si todo está bien
  if (recommendations.length === 0) {
    recommendations.push({
      title: "Mantener ritmo actual",
      description: "Las métricas están dentro de lo esperado.",
      priority: "baja",
    });
  }

  return {
    diagnosis: {
      status,
      headline,
      reason,
      context: {
        positiveRate,
        volume: snapshot.llamadas7d,
        sinResultado,
      },
    },
    recommendations: recommendations.slice(0, 3),
    actions: [
      {
        id: "ventas-review-calls",
        label: "Ver llamadas",
      },
      {
        id: "ventas-reactivate-cold",
        label: "Reactivar leads fríos",
      },
    ],
  };
}
```

(Nota: se corrigió también `undefined: sinResultado` → `sinResultado` en el objeto `context`, que era una key inválida sobrante del código anterior.)

- [ ] **Step 5: Ejecutar todos los tests del analizador de Ventas**

```bash
npm run test -- src/modules/ventas/lib/__tests__/ai-analyzer.test.ts
```

Esperado: 4 tests pasan (3 anteriores — ajustados si alguno asumía `llamadas7d: 2` como "bajo volumen con diagnóstico", ver Step 6 — + 1 nuevo).

- [ ] **Step 6: Revisar el test existente "detects low volume" — ya no aplica igual**

Abre `src/modules/ventas/lib/__tests__/ai-analyzer.test.ts` y busca el test `it("detects low volume", ...)`. Actualmente usa `llamadas7d: 2`, que con el nuevo guard cae en `SIN_SUFICIENTE_SENAL` en vez de en un diagnóstico de "atención". Reemplázalo:

```typescript
  it("returns sin suficiente señal for low call volume (below the 5-call minimum)", () => {
    const lowVolumeSnapshot: VentasSnapshot = {
      ...mockSnapshot,
      llamadas7d: 2,
      llamadasPositivas7d: 1,
    };
    const result = analyzeLlamadasData(lowVolumeSnapshot);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });
```

- [ ] **Step 7: Ejecutar de nuevo y confirmar que todo pasa**

```bash
npm run test -- src/modules/ventas/lib/__tests__/ai-analyzer.test.ts
```

Esperado: 4 tests pasan.

- [ ] **Step 8: Commit**

```bash
git add src/modules/ventas/lib/ai-analyzer.ts src/modules/ventas/lib/__tests__/ai-analyzer.test.ts
git commit -m "fix(ventas): return SIN_SUFICIENTE_SENAL instead of diagnosing on zero data

El analizador generaba diagnóstico y recomendación con 0 llamadas,
violando la regla anti-error de la sección 13.4 del documento de
arquitectura ('si no existe suficiente señal, mostrar Sin suficiente
señal'). Ahora usa hasSufficientSignal() como guard de entrada.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 5: Marketing — aplicar `hasSufficientSignal()` a la conversión de formularios

**Files:**
- Modify: `src/modules/marketing/lib/ai-analyzer.ts`
- Test: `src/modules/marketing/lib/__tests__/ai-analyzer.test.ts`

El documento (sección 8.1) exige evidencia suficiente antes de diagnosticar conversión. Actualmente `analyzeMarketingData` solo evita dividir por cero (`formulariosIniciados30d > 0`), pero con, por ejemplo, 3 formularios iniciados, ya declara "conversión baja" — muestra insuficiente.

- [ ] **Step 1: Escribir el test (debe fallar primero)**

Añade a `src/modules/marketing/lib/__tests__/ai-analyzer.test.ts`:

```typescript
  it("does not diagnose conversion with fewer than 10 form starts", () => {
    const tinySnapshot = {
      ...mockSnapshot,
      formulariosIniciados30d: 3,
      formulariosCompletados30d: 0,
      oportunidades: [], // sin oportunidades tampoco, para aislar la señal de conversión
    };
    const result = analyzeMarketingData(tinySnapshot);
    const conversionRec = result.recommendations.find((r) =>
      r.title.includes("CTA")
    );
    expect(conversionRec).toBeUndefined();
  });
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npm run test -- src/modules/marketing/lib/__tests__/ai-analyzer.test.ts
```

Esperado: FALLA — con `formulariosIniciados30d: 3` y tasa de conversión `0 < 0.2`, la Regla 2 actual se dispara igual y `conversionRec` sí existe.

- [ ] **Step 3: Añadir el guard de señal suficiente a la Regla 2 de conversión**

En `src/modules/marketing/lib/ai-analyzer.ts`, importa el guard:

```typescript
import type { MarketingSnapshot } from "./types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";
import { hasSufficientSignal } from "@/core/lib/ai-engine";
```

Y modifica la condición de la Regla 2 (conversión de formularios) para exigir un mínimo de 10 formularios iniciados antes de diagnosticar:

```typescript
  // Regla 2: Si la conversión de formularios es baja (con suficiente volumen)
  if (hasSufficientSignal(snapshot.formulariosIniciados30d, 10) && conversionRate < 0.2) {
    status = "atención";
    headline = "Conversion de formularios baja";
    reason = `Solo ${(conversionRate * 100).toFixed(1)}% de los inicios se convierten en leads. El embudo pierde ${snapshot.formulariosIniciados30d - snapshot.formulariosCompletados30d} leads potenciales.`;

    recommendations.push({
      title: "Optimizar el CTA y el paso de formulario",
      description:
        "Simplificar el formulario (máximo 3 campos) o cambiar el CTA a algo más urgente.",
      priority: "alta",
      metrics: [
        {
          label: "Tasa conversión actual",
          current: `${(conversionRate * 100).toFixed(1)}%`,
          expected: "25%",
        },
      ],
    });
  }
```

(Nota: se quitó `conversionRate > 0` de la condición original porque `hasSufficientSignal` ya cubre el caso de datos insuficientes, y ahora sí queremos diagnosticar una conversión de exactamente 0% cuando el volumen es suficiente — 0% con 50 formularios iniciados es una señal real, no ruido.)

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npm run test -- src/modules/marketing/lib/__tests__/ai-analyzer.test.ts
```

Esperado: 4 tests pasan (3 anteriores + 1 nuevo). Verifica en particular que el test existente `"identifies conversion funnel issue"` (que usa `formulariosIniciados30d: 100`) siga pasando — 100 ≥ 10, así que no debería verse afectado.

- [ ] **Step 5: Commit**

```bash
git add src/modules/marketing/lib/ai-analyzer.ts src/modules/marketing/lib/__tests__/ai-analyzer.test.ts
git commit -m "fix(marketing): require minimum form volume before diagnosing conversion

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 6: Verificación manual en el dashboard real

- [ ] **Step 1: Reiniciar el dev server con caché limpia**

```bash
cd "C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase"
rm -rf .next
npm run dev
```

- [ ] **Step 2: Confirmar en `/ventas` que con 0 llamadas ya no aparece un diagnóstico inventado**

Navega a `http://localhost:3000/ventas` (o el puerto que asigne). Con los datos reales actuales (0 llamadas en 7 días), el bloque de IA debe mostrar "Sin suficiente señal" en vez de "Solo 0 llamadas esta semana".

- [ ] **Step 3: Ejecutar el test suite completo**

```bash
npm run test 2>&1
```

Esperado: mismos 4 fallos preexistentes de `sheets.test.ts`/`queries.test.ts` (no tocados por este plan), todo lo demás en verde.

- [ ] **Step 4: Build de producción**

```bash
npm run build
```

Esperado: compila sin errores de tipos.

No hay commit en esta tarea — es solo verificación.

---

## Bloque 5: Separar Growth en sus 5 submódulos reales

El documento (secciones 3, 8–12) define Growth como 5 áreas independientes, cada una con su propio dashboard, KPIs, y analizador de IA: **Web**, **Redes**, **Newsletter**, **Cold Email**, **Ads**. Actualmente todo vive mezclado en un único `analyzeMarketingData()` y una única página `/marketing`.

Este bloque reestructura `modules/marketing` en submódulos, sin perder ninguna de las queries de datos que ya existen (Search Console, Buffer, formularios).

### Task 7: Extraer el analizador de Web (bloqbase.net + Atlas)

**Files:**
- Create: `src/modules/marketing/web/ai-analyzer.ts`
- Create: `src/modules/marketing/web/__tests__/ai-analyzer.test.ts`
- Modify: `src/modules/marketing/lib/ai-analyzer.ts` (se reduce a delegar)

El documento (sección 8) separa Web en dos propiedades: `bloqbase.net` (KPIs: Usuarios, Sesiones, Leads, Conversión) y `atlas.bloqbase.net` (KPIs: Clicks orgánicos, Impresiones, URLs indexadas, Keywords Top 10, CTR). El dashboard actual solo tiene datos de Search Console (Atlas), no de GA4 (bloqbase.net) — así que este primer analizador cubre solo Atlas, y deja bloqbase.net como "No conectado" hasta que exista esa fuente de datos, siguiendo la regla de la sección 12.5 ("cuando una plataforma no está conectada, mostrar 'No conectado', nunca 0").

- [ ] **Step 1: Escribir el test (debe fallar primero)**

Crea `src/modules/marketing/web/__tests__/ai-analyzer.test.ts`:

```typescript
import { analyzeAtlasSeo } from "../ai-analyzer";
import type { MarketingSnapshot } from "../../lib/types";
import { describe, it, expect } from "vitest";

describe("Atlas SEO Analyzer (Growth > Web)", () => {
  const mockSnapshot: MarketingSnapshot = {
    fecha: new Date(),
    clicks30d: 1200,
    impresiones30d: 80000,
    posicionMedia: 8.5,
    paginasPublicadas: 45,
    paginasTotal: 50,
    formulariosIniciados30d: 0,
    formulariosCompletados30d: 0,
    oportunidadesPendientes: 25,
    sparkClicks12Sem: [],
    oportunidades: [
      { id: "1", tipo: "CONVIERTE_SIN_TRAFICO_ORGANICO", score: 95, estado: "PENDIENTE", detectadaPorIa: true },
    ],
    redes: [],
    postsBorrador: 0,
    postsProgramados: 0,
    postsPublicados: 0,
    seriesRedes: [],
  };

  it("diagnoses low CTR as the dominant bottleneck when impressions are high but clicks are low", () => {
    const lowCtrSnapshot = { ...mockSnapshot, clicks30d: 100, impresiones30d: 80000 };
    const result = analyzeAtlasSeo(lowCtrSnapshot);
    expect(result.diagnosis.status).not.toBe("bien");
    expect(result.recommendations[0].title.toLowerCase()).toContain("ctr");
  });

  it("prioritizes the single highest-score pending opportunity", () => {
    const result = analyzeAtlasSeo(mockSnapshot);
    expect(result.recommendations[0].description).toContain("95");
  });

  it("caps recommendations at 3", () => {
    const result = analyzeAtlasSeo(mockSnapshot);
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
  });

  it("returns sin suficiente señal when there are fewer than 100 impressions", () => {
    const tinySnapshot = { ...mockSnapshot, impresiones30d: 40, clicks30d: 2 };
    const result = analyzeAtlasSeo(tinySnapshot);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npm run test -- src/modules/marketing/web/__tests__/ai-analyzer.test.ts
```

Esperado: FALLA — el módulo `../ai-analyzer` (`src/modules/marketing/web/ai-analyzer.ts`) no existe todavía.

- [ ] **Step 3: Crear el analizador de Atlas SEO**

Crea `src/modules/marketing/web/ai-analyzer.ts`:

```typescript
import type { MarketingSnapshot } from "../lib/types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { hasSufficientSignal } from "@/core/lib/ai-engine";

/**
 * Analizador de Growth > Web > atlas.bloqbase.net (documento sección 8.2).
 * bloqbase.net (GA4) no está cubierto aquí porque esa fuente de datos
 * todavía no está conectada — cuando lo esté, se añade un analizador
 * hermano `analyzeBloqbaseNet()` en este mismo módulo, sin tocar este.
 */
export function analyzeAtlasSeo(snapshot: MarketingSnapshot): AIRecommendationData {
  // Regla anti-error (sección 8.2): con pocas impresiones no hay evidencia
  // suficiente para diagnosticar CTR ni cobertura.
  if (!hasSufficientSignal(snapshot.impresiones30d, 100)) {
    return SIN_SUFICIENTE_SENAL;
  }

  const recommendations: Recommendation[] = [];
  const ctr = snapshot.impresiones30d > 0 ? snapshot.clicks30d / snapshot.impresiones30d : 0;
  const coveragePercent =
    snapshot.paginasTotal > 0 ? (snapshot.paginasPublicadas / snapshot.paginasTotal) * 100 : 100;

  const highScoreOpportunities = snapshot.oportunidades
    .filter((o) => o.estado === "PENDIENTE" && o.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  let status: "bien" | "atención" | "crítico" = "bien";
  let headline = "Atlas SEO en buen estado";
  let reason = "Clicks, CTR y cobertura están dentro de lo esperado.";

  // Cuello de botella dominante: CTR bajo con impresiones y posición competitivas
  // (sección 8.2: "identifica el cuello de botella dominante -- CTR, posición,
  // cobertura, contenido o indexación -- y propone una sola acción principal").
  const ctrEsperado = 0.02; // 2% es un CTR conservador de referencia para posiciones medias/altas
  if (ctr < ctrEsperado && snapshot.posicionMedia != null && snapshot.posicionMedia < 15) {
    status = "atención";
    headline = "CTR por debajo de lo esperado para la posición media actual";
    reason = `Hay ${snapshot.impresiones30d} impresiones con posición media ${snapshot.posicionMedia}, pero el CTR es solo ${(ctr * 100).toFixed(2)}%.`;

    recommendations.push({
      title: "Mejorar el CTR de las páginas con más impresiones",
      description: "Priorizar mejoras de title y meta description en las páginas con mayor volumen de impresiones y CTR bajo.",
      priority: "alta",
      metrics: [{ label: "CTR actual", current: `${(ctr * 100).toFixed(2)}%`, expected: `${(ctrEsperado * 100).toFixed(0)}%` }],
    });
  }

  // Oportunidad de mayor score, máximo 3 páginas/clusters (sección 8.2)
  if (highScoreOpportunities.length > 0) {
    status = status === "bien" ? "atención" : status;
    const top = highScoreOpportunities[0];
    recommendations.push({
      title: "Priorizar la oportunidad SEO de mayor impacto",
      description: `${top.tipo} tiene score ${top.score}. Es la oportunidad con mayor impacto probable ahora mismo.`,
      priority: "alta",
      metrics: [{ label: "Oportunidades pendientes", current: highScoreOpportunities.length }],
    });
  }

  if (coveragePercent < 80) {
    status = status === "bien" ? "atención" : status;
    recommendations.push({
      title: "Publicar las páginas en borrador",
      description: `Cobertura actual: ${coveragePercent.toFixed(0)}%. Publicar el resto amplía la superficie indexable.`,
      priority: "media",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Mantener el ritmo actual",
      description: "CTR, cobertura e indexación están saludables.",
      priority: "baja",
    });
  }

  return {
    diagnosis: { status, headline, reason, context: { ctr, coveragePercent } },
    recommendations: recommendations.slice(0, 3),
    actions: [
      { id: "web-atlas-review-opportunities", label: "Revisar oportunidades" },
      { id: "web-atlas-prepare-meta", label: "Preparar mejoras de meta" },
    ],
  };
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npm run test -- src/modules/marketing/web/__tests__/ai-analyzer.test.ts
```

Esperado: 4 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/modules/marketing/web/ai-analyzer.ts src/modules/marketing/web/__tests__/ai-analyzer.test.ts
git commit -m "feat(growth): extract Atlas SEO analyzer into growth/web submodule

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 8: Extraer el analizador de Redes

**Files:**
- Create: `src/modules/marketing/redes/ai-analyzer.ts`
- Create: `src/modules/marketing/redes/__tests__/ai-analyzer.test.ts`

El documento (sección 9) exige comparar cada red **contra su propio baseline**, no entre sí con umbrales genéricos, y declarar "Sin suficiente señal" cuando falte histórico (sección 9.3).

- [ ] **Step 1: Escribir el test (debe fallar primero)**

Crea `src/modules/marketing/redes/__tests__/ai-analyzer.test.ts`:

```typescript
import { analyzeRedesData } from "../ai-analyzer";
import type { MarketingRedSocial, SerieRedSocialPunto } from "../../lib/types";
import { describe, it, expect } from "vitest";

describe("Redes Analyzer (Growth > Redes)", () => {
  const redes: MarketingRedSocial[] = [
    { canal: "linkedin", posts: 8, alcance: 2000, impresiones: 5000, clicks: 150, interacciones: 420 },
    { canal: "instagram", posts: 12, alcance: 100, impresiones: 300, clicks: 5, interacciones: 10 },
  ];

  function seriePara(canal: string, valores: number[]): SerieRedSocialPunto[] {
    return valores.map((value, i) => ({
      fecha: `2026-08-${String(i + 1).padStart(2, "0")}`,
      canal,
      metricName: "Impressions",
      value,
    }));
  }

  it("flags a channel whose recent reach is far below its own historical baseline", () => {
    const series = [
      ...seriePara("instagram", [1000, 1050, 980, 1020]), // baseline histórico alto
      ...seriePara("linkedin", [5000, 5100, 4900, 5000]),
    ];
    const result = analyzeRedesData(redes, series);
    expect(result.diagnosis.headline.toLowerCase()).toContain("instagram");
  });

  it("returns sin suficiente señal when no channel has at least 3 historical data points", () => {
    const series = seriePara("instagram", [1000, 1050]); // solo 2 puntos
    const result = analyzeRedesData(redes, series);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npm run test -- src/modules/marketing/redes/__tests__/ai-analyzer.test.ts
```

Esperado: FALLA — el módulo no existe.

- [ ] **Step 3: Crear el analizador de Redes**

Crea `src/modules/marketing/redes/ai-analyzer.ts`:

```typescript
import type { MarketingRedSocial, SerieRedSocialPunto } from "../lib/types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { compareToHistoricalBaseline } from "@/core/lib/ai-engine";

/**
 * Analizador de Growth > Redes (documento sección 9). Compara cada canal
 * contra SU PROPIO histórico de impresiones, nunca contra otro canal ni
 * contra un umbral fijo -- sección 9: "no se suman métricas distintas
 * entre plataformas como si fueran equivalentes".
 */
export function analyzeRedesData(
  redes: MarketingRedSocial[],
  series: SerieRedSocialPunto[]
): AIRecommendationData {
  const porCanal = new Map<string, number[]>();
  for (const punto of series) {
    if (punto.metricName !== "Impressions") continue;
    const arr = porCanal.get(punto.canal) ?? [];
    arr.push(punto.value);
    porCanal.set(punto.canal, arr);
  }

  type Deterioro = { canal: string; deltaPercent: number };
  const deterioros: Deterioro[] = [];

  for (const red of redes) {
    const historial = porCanal.get(red.canal) ?? [];
    if (historial.length < 3) continue; // sin histórico suficiente para ESTE canal

    const comparacion = compareToHistoricalBaseline(red.impresiones, historial);
    if (comparacion.status === "down") {
      deterioros.push({ canal: red.canal, deltaPercent: comparacion.deltaPercent });
    }
  }

  const algunCanalConHistorial = redes.some((r) => (porCanal.get(r.canal) ?? []).length >= 3);
  if (!algunCanalConHistorial) {
    return SIN_SUFICIENTE_SENAL;
  }

  const recommendations: Recommendation[] = [];
  let status: "bien" | "atención" | "crítico" = "bien";
  let headline = "Redes sociales en buen estado";
  let reason = "Ningún canal muestra una caída significativa frente a su propio histórico.";

  if (deterioros.length > 0) {
    deterioros.sort((a, b) => b.deltaPercent - a.deltaPercent);
    const peor = deterioros[0];
    status = "atención";
    headline = `${peor.canal} cae frente a su baseline`;
    reason = `${peor.canal} está ${peor.deltaPercent.toFixed(0)}% por debajo de su media histórica de impresiones.`;

    recommendations.push({
      title: `Cambiar formato o temática en ${peor.canal}`,
      description: "El rendimiento reciente está claramente por debajo del histórico propio de este canal.",
      priority: "alta",
      metrics: [{ label: "Caída vs. baseline", current: `${peor.deltaPercent.toFixed(0)}%` }],
    });
  } else {
    recommendations.push({
      title: "Mantener el ritmo actual",
      description: "Todos los canales con histórico suficiente están estables o en crecimiento.",
      priority: "baja",
    });
  }

  return {
    diagnosis: { status, headline, reason, context: { deterioros } },
    recommendations: recommendations.slice(0, 3),
    actions: [
      { id: "redes-ver-analisis", label: "Ver análisis" },
      { id: "redes-preparar-posts", label: "Preparar posts" },
    ],
  };
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npm run test -- src/modules/marketing/redes/__tests__/ai-analyzer.test.ts
```

Esperado: 2 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/modules/marketing/redes/ai-analyzer.ts src/modules/marketing/redes/__tests__/ai-analyzer.test.ts
git commit -m "feat(growth): extract Redes analyzer comparing each channel to its own baseline

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 9: Query de series históricas de impresiones por canal (dato real para Task 8)

**Files:**
- Modify: `src/modules/marketing/lib/queries.ts`
- Modify: `src/modules/marketing/lib/types.ts`

`analyzeRedesData` (Task 8) ya recibe `series: SerieRedSocialPunto[]`, y `buildMarketingSnapshot()` ya calcula `seriesRedes` con exactamente esa forma (ver `src/modules/marketing/lib/queries.ts`, variable `seriesRaw` / `seriesRedes`). No hace falta una query nueva — solo conectar el dato existente al nuevo analizador.

- [ ] **Step 1: Añadir el campo `redesAnalysis` al `MarketingSnapshot`**

En `src/modules/marketing/lib/types.ts`, añade el campo tras `aiAnalysis`:

```typescript
export type MarketingSnapshot = {
  fecha: string | Date;
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
  postsBorrador: number;
  postsProgramados: number;
  postsPublicados: number;
  seriesRedes: SerieRedSocialPunto[];
  aiAnalysis?: AIRecommendationData;
  redesAnalysis?: AIRecommendationData;
};
```

- [ ] **Step 2: Calcular `redesAnalysis` en `buildMarketingSnapshot()`**

En `src/modules/marketing/lib/queries.ts`, añade el import:

```typescript
import { analyzeRedesData } from "../redes/ai-analyzer";
```

Y en el bloque donde ya se calcula `snapshot.aiAnalysis = analyzeMarketingData(snapshot);`, añade la línea siguiente:

```typescript
  snapshot.aiAnalysis = analyzeMarketingData(snapshot);
  snapshot.redesAnalysis = analyzeRedesData(snapshot.redes, snapshot.seriesRedes);

  return snapshot;
}
```

- [ ] **Step 3: Ejecutar el test suite completo de marketing para confirmar que no rompe nada**

```bash
npm run test -- src/modules/marketing
```

Esperado: todos los tests de `marketing` pasan (incluye `queries.test.ts`, que puede tener sus 1-2 fallos preexistentes ya conocidos, pero ninguno nuevo).

- [ ] **Step 4: Commit**

```bash
git add src/modules/marketing/lib/types.ts src/modules/marketing/lib/queries.ts
git commit -m "feat(growth): wire redesAnalysis into buildMarketingSnapshot

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 10: Actualizar la página de Marketing para mostrar ambos análisis por separado

**Files:**
- Modify: `src/app/marketing/page.tsx`

Actualmente la página muestra un único `<MarketingAIRecommendation data={snapshot.aiAnalysis} />` en la sección "01 — Tráfico". Ahora debe mostrar también el análisis de Redes en su propia sección "02 — Contenido", siguiendo el patrón de la sección 9 del documento (cada submódulo tiene su propia IA).

- [ ] **Step 1: Localizar la sección "02 — Contenido" en `src/app/marketing/page.tsx`**

Busca el bloque que empieza con:

```tsx
        {/* 02 — CONTENIDO */}
        <section className="mt-[56px] border-t-2 border-[color:var(--grafito)] pt-[26px]">
```

- [ ] **Step 2: Insertar el componente de IA de Redes tras el gráfico `SocialMetricsChart`**

Dentro de esa sección, justo después del bloque:

```tsx
          <div className="mt-[22px]">
            <SocialMetricsChart series={snapshot?.seriesRedes ?? []} />
          </div>
```

Añade:

```tsx
          {snapshot?.redesAnalysis && <MarketingAIRecommendation data={snapshot.redesAnalysis} />}
```

(Reutiliza el componente `MarketingAIRecommendation` ya existente — no hace falta uno nuevo, porque solo envuelve `AIRecommendation` con el server action; el contenido cambia según el `data` que reciba.)

- [ ] **Step 3: Verificar visualmente**

```bash
npm run dev
```

Navega a `/marketing` y confirma que ahora aparecen **dos** bloques de IA: uno en Tráfico (SEO/oportunidades) y otro en Contenido (Redes), cada uno con su propio diagnóstico.

- [ ] **Step 4: Ejecutar el build**

```bash
npm run build
```

Esperado: compila sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/app/marketing/page.tsx
git commit -m "feat(growth): show Redes AI analysis as its own block in the Contenido section

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 11: Nota de alcance — Newsletter, Cold Email y Ads quedan fuera de este plan

El documento define Newsletter (sección 10, fuente: Beehiiv), Cold Email (sección 11, fuente: plataforma de cold email + CRM) y Ads (sección 12, fuente: plataformas publicitarias) como submódulos de Growth con analizador propio. **Ninguno de los tres tiene fuente de datos conectada todavía** en `buildMarketingSnapshot()` — no hay integración con Beehiiv, ni con una plataforma de cold email ni con Google/Meta/LinkedIn Ads en el código actual.

Siguiendo la regla de la sección 12.5 ("el módulo puede arrancar vacío: cada plataforma aparece como 'No conectado' hasta disponer de datos reales"), estos tres submódulos no se implementan en este plan porque implementarlos sin datos reales significaría o (a) simular datos falsos, que el documento prohíbe explícitamente, o (b) construir integraciones nuevas con Beehiiv/plataformas de cold email/Ads, que es trabajo de integración de datos, no de lógica de dashboard, y merece su propio plan una vez la fuente de datos exista.

- [ ] **Step 1: Documentar la decisión en el código**

Crea `src/modules/marketing/README.md`:

```markdown
# Growth (Marketing)

Submódulos según `Bloqbase_Dashboard_Interno_Arquitectura_v1.md` sección 3.2:

| Submódulo | Estado | Fuente de datos |
|---|---|---|
| Web (Atlas) | Implementado | Search Console (`seo.page_performance_daily`, `seo.opportunities`) |
| Web (bloqbase.net) | No implementado | Pendiente: GA4 |
| Redes | Implementado | Buffer (`social.metricas`, `social.posts`) |
| Newsletter | No implementado | Pendiente: Beehiiv |
| Cold Email | No implementado | Pendiente: plataforma de cold email + CRM |
| Ads | No implementado | Pendiente: Google/Meta/LinkedIn Ads |

Cuando se conecte una fuente nueva, el patrón a seguir es el mismo de
`web/ai-analyzer.ts` y `redes/ai-analyzer.ts`: un analizador propio que
recibe datos ya tipados, aplica `hasSufficientSignal()` como guard de
entrada, y compara contra baseline histórico con
`compareToHistoricalBaseline()` en vez de umbrales fijos.
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/marketing/README.md
git commit -m "docs(growth): document which Growth submodules are implemented vs pending data source

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Bloque 6: Pipeline de Ventas de 6 etapas + bloqueos + prioridades de hoy

El documento (sección 13.2) define un pipeline explícito: **Nuevo/por contactar → Contactado → Interés → Reunión → Piloto/prueba → Cliente**, con "Perdido" fuera del funnel principal. Actualmente `VentasSnapshot` solo tiene `llamadasRecientes` (con `resultado: string` libre) y `pipelineProspeccion` (con `estado: string` libre, sin relación con las 6 etapas). Este bloque introduce el tipo de etapa explícito y el análisis de bloqueos.

### Task 12: Tipo `EtapaPipeline` y función de clasificación

**Files:**
- Modify: `src/modules/ventas/lib/types.ts`
- Create: `src/modules/ventas/lib/pipeline.ts`
- Test: `src/modules/ventas/lib/__tests__/pipeline.test.ts`

- [ ] **Step 1: Escribir el test (debe fallar primero)**

Crea `src/modules/ventas/lib/__tests__/pipeline.test.ts`:

```typescript
import { clasificarEtapa, ETAPAS_PIPELINE } from "../pipeline";
import { describe, it, expect } from "vitest";

describe("clasificarEtapa", () => {
  it("classifies known estado strings from prospección sheets", () => {
    expect(clasificarEtapa("Nuevo")).toBe("nuevo");
    expect(clasificarEtapa("Pendiente contacto")).toBe("nuevo");
    expect(clasificarEtapa("Contactado")).toBe("contactado");
    expect(clasificarEtapa("Respondió (Positiva)")).toBe("interes");
    expect(clasificarEtapa("Respondió (Neutra)")).toBe("contactado");
  });

  it("classifies llamada resultado strings", () => {
    expect(clasificarEtapa("INTERESADO")).toBe("interes");
    expect(clasificarEtapa("NECESITA_SEGUIMIENTO")).toBe("contactado");
    expect(clasificarEtapa("NO_INTERESADO")).toBe("perdido");
  });

  it("falls back to nuevo for unrecognized strings", () => {
    expect(clasificarEtapa("algo-desconocido")).toBe("nuevo");
  });

  it("exports the 6 pipeline stages in order, excluding perdido", () => {
    expect(ETAPAS_PIPELINE).toEqual([
      "nuevo",
      "contactado",
      "interes",
      "reunion",
      "piloto",
      "cliente",
    ]);
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npm run test -- src/modules/ventas/lib/__tests__/pipeline.test.ts
```

Esperado: FALLA — el módulo `../pipeline` no existe.

- [ ] **Step 3: Definir el tipo y la función de clasificación**

Crea `src/modules/ventas/lib/pipeline.ts`:

```typescript
/**
 * Pipeline de Ventas (documento sección 13.2): Nuevo/por contactar →
 * Contactado → Interés → Reunión → Piloto/prueba → Cliente. "Perdido"
 * queda fuera del funnel principal (sección 13.2) y se analiza aparte
 * por motivo (sección 13.5).
 */
export type EtapaPipeline =
  | "nuevo"
  | "contactado"
  | "interes"
  | "reunion"
  | "piloto"
  | "cliente"
  | "perdido";

export const ETAPAS_PIPELINE: Exclude<EtapaPipeline, "perdido">[] = [
  "nuevo",
  "contactado",
  "interes",
  "reunion",
  "piloto",
  "cliente",
];

const MAPEO_ESTADOS: Record<string, EtapaPipeline> = {
  // Estados de Google Sheets (prospección LinkedIn/partners/subvenciones)
  "nuevo": "nuevo",
  "pendiente contacto": "nuevo",
  "contactado": "contactado",
  "respondió (neutra)": "contactado",
  "respondió (positiva)": "interes",
  // Resultados de llamadas (ventas.llamadas)
  "interesado": "interes",
  "necesita_seguimiento": "contactado",
  "no_interesado": "perdido",
};

/**
 * Traduce un estado libre (de Sheets o de resultado de llamada) a una
 * etapa del pipeline de 6 fases. Los estados no reconocidos caen en
 * "nuevo" por ser la etapa más conservadora (nunca asumimos progreso
 * comercial sin una señal explícita -- sección 13.4).
 */
export function clasificarEtapa(estadoLibre: string): EtapaPipeline {
  const normalizado = estadoLibre.trim().toLowerCase();
  return MAPEO_ESTADOS[normalizado] ?? "nuevo";
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npm run test -- src/modules/ventas/lib/__tests__/pipeline.test.ts
```

Esperado: 4 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/modules/ventas/lib/pipeline.ts src/modules/ventas/lib/__tests__/pipeline.test.ts
git commit -m "feat(ventas): add 6-stage pipeline classification per architecture doc

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 13: Función de detección de bloqueos y "Prioridades de hoy"

**Files:**
- Modify: `src/modules/ventas/lib/pipeline.ts`
- Modify: `src/modules/ventas/lib/__tests__/pipeline.test.ts`

El documento (sección 13.2) exige: *"Bloqueos: oportunidades sin movimiento o sin siguiente acción definida"* y *"Prioridades de hoy: máximo 5 contactos u oportunidades que merecen atención."*

- [ ] **Step 1: Escribir el test (debe fallar primero)**

Añade a `src/modules/ventas/lib/__tests__/pipeline.test.ts`:

```typescript
import { detectarBloqueos, type OportunidadPipeline } from "../pipeline";

describe("detectarBloqueos", () => {
  const hoy = new Date("2026-09-24");

  function oportunidad(overrides: Partial<OportunidadPipeline>): OportunidadPipeline {
    return {
      id: "1",
      nombre: "Empresa Test",
      etapa: "interes",
      ultimoContacto: "2026-09-20",
      origen: "linkedin",
      ...overrides,
    };
  }

  it("flags opportunities with no contact in more than 7 days as blocked", () => {
    const oportunidades = [
      oportunidad({ id: "a", ultimoContacto: "2026-09-10" }), // 14 días
      oportunidad({ id: "b", ultimoContacto: "2026-09-23" }), // 1 día
    ];
    const bloqueos = detectarBloqueos(oportunidades, hoy);
    expect(bloqueos.map((b) => b.id)).toEqual(["a"]);
  });

  it("excludes cliente and perdido stages from blockage detection", () => {
    const oportunidades = [
      oportunidad({ id: "a", etapa: "cliente", ultimoContacto: "2026-01-01" }),
      oportunidad({ id: "b", etapa: "perdido", ultimoContacto: "2026-01-01" }),
    ];
    const bloqueos = detectarBloqueos(oportunidades, hoy);
    expect(bloqueos).toHaveLength(0);
  });

  it("caps prioridades de hoy at 5, ordered by days blocked descending", () => {
    const oportunidades = Array.from({ length: 8 }, (_, i) =>
      oportunidad({ id: String(i), ultimoContacto: `2026-08-${20 + i}` })
    );
    const bloqueos = detectarBloqueos(oportunidades, hoy);
    const prioridades = bloqueos.slice(0, 5);
    expect(prioridades).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npm run test -- src/modules/ventas/lib/__tests__/pipeline.test.ts
```

Esperado: FALLA — `detectarBloqueos` y `OportunidadPipeline` no existen.

- [ ] **Step 3: Implementar en `pipeline.ts`**

Añade al final de `src/modules/ventas/lib/pipeline.ts`:

```typescript
export interface OportunidadPipeline {
  id: string;
  nombre: string;
  etapa: EtapaPipeline;
  ultimoContacto: string; // formato ISO "YYYY-MM-DD"
  origen: string;
}

export interface Bloqueo extends OportunidadPipeline {
  diasSinMovimiento: number;
}

const DIAS_LIMITE_BLOQUEO = 7;
const ETAPAS_FUERA_DE_FUNNEL: EtapaPipeline[] = ["cliente", "perdido"];

/**
 * Detecta oportunidades sin movimiento (documento sección 13.2). Excluye
 * cliente y perdido: ya salieron del funnel activo, así que no cuentan
 * como bloqueo. Ordena de mayor a menor días sin movimiento -- el consumidor
 * (analyzePipelineData) toma los primeros 5 como "Prioridades de hoy".
 */
export function detectarBloqueos(
  oportunidades: OportunidadPipeline[],
  hoy: Date
): Bloqueo[] {
  const bloqueos: Bloqueo[] = [];

  for (const op of oportunidades) {
    if (ETAPAS_FUERA_DE_FUNNEL.includes(op.etapa)) continue;

    const fechaContacto = new Date(op.ultimoContacto);
    const diasSinMovimiento = Math.floor(
      (hoy.getTime() - fechaContacto.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diasSinMovimiento > DIAS_LIMITE_BLOQUEO) {
      bloqueos.push({ ...op, diasSinMovimiento });
    }
  }

  return bloqueos.sort((a, b) => b.diasSinMovimiento - a.diasSinMovimiento);
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npm run test -- src/modules/ventas/lib/__tests__/pipeline.test.ts
```

Esperado: 7 tests pasan (4 de `clasificarEtapa` + 3 de `detectarBloqueos`).

- [ ] **Step 5: Commit**

```bash
git add src/modules/ventas/lib/pipeline.ts src/modules/ventas/lib/__tests__/pipeline.test.ts
git commit -m "feat(ventas): add bloqueo detection for 'Prioridades de hoy'

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 14: Construir el pipeline unificado desde las fuentes existentes

**Files:**
- Modify: `src/modules/ventas/lib/queries.ts`
- Test: `src/modules/ventas/lib/__tests__/queries.test.ts`

Ahora mismo `buildLlamadasSnapshot()` solo lee llamadas; `fetchProspeccionSnapshot()` (en `sheets.ts`) lee prospección por separado. El documento (sección 13.7) es explícito: *"Prospección LinkedIn, cold email o leads de anuncios no necesitan dashboards comerciales separados dentro de Ventas. Todos terminan en el mismo pipeline."* Esta tarea unifica ambas fuentes en una lista de `OportunidadPipeline`.

- [ ] **Step 1: Escribir el test (debe fallar primero)**

Añade a `src/modules/ventas/lib/__tests__/queries.test.ts` (si el archivo no importa aún `buildPipelineUnificado`, añade el import al principio):

```typescript
import { buildPipelineUnificado } from "../queries";
import type { LeadProspeccion } from "../types";
import type { LlamadaVenta } from "../types";
```

Y añade el test:

```typescript
describe("buildPipelineUnificado", () => {
  it("merges llamadas and prospección leads into a single pipeline list", () => {
    const llamadas: LlamadaVenta[] = [
      { id: "call-1", prospecto: "Empresa Llamada", resultado: "INTERESADO", resumen: "..." },
    ];
    const leads: LeadProspeccion[] = [
      { fuente: "linkedin", empresa: "Empresa Sheet", estado: "Contactado", fecha: "2026-09-01" },
    ];

    const pipeline = buildPipelineUnificado(llamadas, leads);

    expect(pipeline).toHaveLength(2);
    expect(pipeline.find((o) => o.nombre === "Empresa Llamada")?.etapa).toBe("interes");
    expect(pipeline.find((o) => o.nombre === "Empresa Sheet")?.etapa).toBe("contactado");
  });

  it("skips prospección rows with an empty empresa field", () => {
    const leads: LeadProspeccion[] = [
      { fuente: "linkedin", empresa: "", estado: "Nuevo", fecha: "2026-09-01" },
    ];
    const pipeline = buildPipelineUnificado([], leads);
    expect(pipeline).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npm run test -- src/modules/ventas/lib/__tests__/queries.test.ts
```

Esperado: FALLA — `buildPipelineUnificado` no está exportado desde `queries.ts`.

- [ ] **Step 3: Implementar `buildPipelineUnificado` en `queries.ts`**

En `src/modules/ventas/lib/queries.ts`, añade el import y la función:

```typescript
import type { LlamadaVenta, VentasSnapshot, LeadProspeccion } from "./types";
import { clasificarEtapa, type OportunidadPipeline } from "./pipeline";
```

Y añade la función, antes o después de `buildLlamadasSnapshot`:

```typescript
/**
 * Unifica llamadas y leads de prospección (LinkedIn, partners, subvenciones)
 * en una única lista de oportunidades de pipeline, siguiendo la sección
 * 13.7 del documento: "todos terminan en el mismo pipeline. El canal
 * explica el origen; la etapa comercial explica qué hacer con la
 * oportunidad."
 */
export function buildPipelineUnificado(
  llamadas: LlamadaVenta[],
  leads: LeadProspeccion[]
): OportunidadPipeline[] {
  const desdeLlamadas: OportunidadPipeline[] = llamadas.map((l) => ({
    id: `llamada-${l.id}`,
    nombre: l.prospecto,
    etapa: clasificarEtapa(l.resultado),
    ultimoContacto: new Date().toISOString().slice(0, 10), // las llamadas no traen fecha propia en LlamadaVenta
    origen: "llamada",
  }));

  const desdeLeads: OportunidadPipeline[] = leads
    .filter((l) => l.empresa.trim().length > 0)
    .map((l, idx) => ({
      id: `${l.fuente}-${idx}`,
      nombre: l.empresa,
      etapa: clasificarEtapa(l.estado),
      ultimoContacto: l.fecha || new Date().toISOString().slice(0, 10),
      origen: l.fuente,
    }));

  return [...desdeLlamadas, ...desdeLeads];
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npm run test -- src/modules/ventas/lib/__tests__/queries.test.ts
```

Esperado: los 2 tests nuevos pasan (los tests preexistentes de este archivo pueden seguir con su fallo conocido si ya lo tenían — verifica que el conteo de fallos no aumente respecto al baseline de 4 fallos totales del proyecto).

- [ ] **Step 5: Commit**

```bash
git add src/modules/ventas/lib/queries.ts src/modules/ventas/lib/__tests__/queries.test.ts
git commit -m "feat(ventas): unify llamadas and prospección leads into a single pipeline

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 15: Analizador de pipeline — bloqueos + prioridades de hoy como IA 80/20

**Files:**
- Create: `src/modules/ventas/lib/pipeline-analyzer.ts`
- Test: `src/modules/ventas/lib/__tests__/pipeline-analyzer.test.ts`

- [ ] **Step 1: Escribir el test (debe fallar primero)**

Crea `src/modules/ventas/lib/__tests__/pipeline-analyzer.test.ts`:

```typescript
import { analyzePipelineData } from "../pipeline-analyzer";
import type { OportunidadPipeline } from "../pipeline";
import { describe, it, expect } from "vitest";

describe("Pipeline Analyzer (Ventas > IA 80/20)", () => {
  const hoy = new Date("2026-09-24");

  function oportunidad(overrides: Partial<OportunidadPipeline>): OportunidadPipeline {
    return {
      id: "1",
      nombre: "Empresa Test",
      etapa: "interes",
      ultimoContacto: "2026-09-20",
      origen: "linkedin",
      ...overrides,
    };
  }

  it("returns sin suficiente señal with fewer than 5 opportunities in the pipeline", () => {
    const pipeline = [oportunidad({ id: "1" }), oportunidad({ id: "2" })];
    const result = analyzePipelineData(pipeline, hoy);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });

  it("flags blocked opportunities as the top priority when there are 8+ stuck for 7+ days", () => {
    const pipeline = Array.from({ length: 8 }, (_, i) =>
      oportunidad({ id: String(i), ultimoContacto: "2026-09-01" }) // 23 días
    );
    const result = analyzePipelineData(pipeline, hoy);
    expect(result.diagnosis.status).toBe("requiere_accion");
    expect(result.recommendations[0].title.toLowerCase()).toContain("reactivar");
  });

  it("caps prioridades de hoy metric at 5", () => {
    const pipeline = Array.from({ length: 8 }, (_, i) =>
      oportunidad({ id: String(i), ultimoContacto: "2026-09-01" })
    );
    const result = analyzePipelineData(pipeline, hoy);
    const metricaPrioridades = result.recommendations[0].metrics?.find((m) =>
      m.label.includes("Prioridades")
    );
    expect(metricaPrioridades?.current).toBe(5);
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npm run test -- src/modules/ventas/lib/__tests__/pipeline-analyzer.test.ts
```

Esperado: FALLA — el módulo `../pipeline-analyzer` no existe.

- [ ] **Step 3: Implementar `analyzePipelineData`**

Crea `src/modules/ventas/lib/pipeline-analyzer.ts`:

```typescript
import type { OportunidadPipeline } from "./pipeline";
import { detectarBloqueos } from "./pipeline";
import type { AIRecommendationData } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { hasSufficientSignal } from "@/core/lib/ai-engine";

const MAX_PRIORIDADES_HOY = 5;

/**
 * IA 80/20 de Ventas a nivel de pipeline completo (documento sección 13.2:
 * "IA 80/20: una única recomendación comercial prioritaria a nivel de
 * módulo"). Complementa a analyzeLlamadasData (que mira solo la actividad
 * de llamadas): este analizador mira el pipeline unificado -- llamadas +
 * prospección -- y su función es detectar oportunidades olvidadas.
 */
export function analyzePipelineData(
  pipeline: OportunidadPipeline[],
  hoy: Date = new Date()
): AIRecommendationData {
  if (!hasSufficientSignal(pipeline.length, 5)) {
    return SIN_SUFICIENTE_SENAL;
  }

  const bloqueos = detectarBloqueos(pipeline, hoy);
  const prioridadesHoy = bloqueos.slice(0, MAX_PRIORIDADES_HOY);

  if (bloqueos.length === 0) {
    return {
      diagnosis: {
        status: "bien",
        headline: "Pipeline sin bloqueos",
        reason: "Ninguna oportunidad activa lleva más de 7 días sin movimiento.",
        context: { totalPipeline: pipeline.length },
      },
      recommendations: [
        {
          title: "Mantener el ritmo de seguimiento actual",
          description: "El pipeline está sano: no hay oportunidades olvidadas.",
          priority: "baja",
        },
      ],
      actions: [{ id: "ventas-ver-pipeline", label: "Ver pipeline" }],
    };
  }

  return {
    diagnosis: {
      status: "requiere_accion",
      headline: `${bloqueos.length} oportunidades sin movimiento en más de 7 días`,
      reason: `Hay ${bloqueos.length} oportunidades en el pipeline activo sin ningún contacto reciente. La más antigua lleva ${bloqueos[0].diasSinMovimiento} días sin movimiento.`,
      context: { totalBloqueos: bloqueos.length, totalPipeline: pipeline.length },
    },
    recommendations: [
      {
        title: `Reactivar las ${prioridadesHoy.length} oportunidades más urgentes`,
        description: "Priorizar el contacto con estas antes de abrir conversaciones nuevas evita perder oportunidades ya calificadas.",
        priority: "alta",
        metrics: [
          { label: "Prioridades de hoy", current: prioridadesHoy.length },
          { label: "Total bloqueadas", current: bloqueos.length },
        ],
      },
    ],
    actions: [
      { id: "ventas-preparar-followups", label: "Preparar follow-ups" },
      { id: "ventas-ver-pipeline", label: "Ver pipeline" },
    ],
  };
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npm run test -- src/modules/ventas/lib/__tests__/pipeline-analyzer.test.ts
```

Esperado: 3 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/modules/ventas/lib/pipeline-analyzer.ts src/modules/ventas/lib/__tests__/pipeline-analyzer.test.ts
git commit -m "feat(ventas): add pipeline-level AI analyzer for bloqueos and prioridades de hoy

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 16: Integrar el pipeline unificado y su análisis en la página de Ventas

**Files:**
- Modify: `src/app/ventas/page.tsx`
- Modify: `src/modules/ventas/components/VentasAIRecommendation.tsx` (ninguna modificación de lógica — se reutiliza tal cual, solo se instancia dos veces)

- [ ] **Step 1: Añadir los imports necesarios en `page.tsx`**

En `src/app/ventas/page.tsx`, añade a los imports existentes:

```typescript
import { buildPipelineUnificado } from "@/modules/ventas/lib/queries";
import { analyzePipelineData } from "@/modules/ventas/lib/pipeline-analyzer";
```

- [ ] **Step 2: Construir el pipeline unificado y su análisis en el componente de página**

Localiza el bloque donde ya se obtienen `llamadasData` y `pipeline` (la variable que ya existe, resultado de `fetchProspeccionSnapshot()`), y añade justo después:

```typescript
  const pipelineUnificado = buildPipelineUnificado(llamadas, pipeline);
  const pipelineAnalysis = analyzePipelineData(pipelineUnificado);
```

(`llamadas` ya es la variable `LlamadaVenta[]` extraída de `llamadasData?.llamadasRecientes ?? []`, y `pipeline` ya es el resultado de `fetchProspeccionSnapshot()` — ambas ya existen en el archivo, verifica los nombres exactos con `grep -n "const llamadas" src/app/ventas/page.tsx` antes de escribir esta línea, por si el nombre de variable difiere ligeramente.)

- [ ] **Step 3: Renderizar el análisis de pipeline en la sección de Pipeline de prospección**

Busca la sección:

```tsx
        <section className="mt-[56px] border-t-2 border-[color:var(--grafito)] pt-[26px]">
          <div className="bq-sec-head">
            <span className="bq-sec-num">02</span>
            <span className="bq-sec-title">Pipeline de prospección</span>
          </div>
```

Y añade justo después del párrafo descriptivo que le sigue (antes de las tres tablas `leadTable(...)`):

```tsx
          {pipelineAnalysis && <VentasAIRecommendation data={pipelineAnalysis} />}
```

- [ ] **Step 4: Verificar visualmente**

```bash
npm run dev
```

Navega a `/ventas` y confirma que la sección "Pipeline de prospección" ahora muestra un bloque de IA con bloqueos y "Prioridades de hoy" (o "Sin suficiente señal" si el pipeline unificado tiene menos de 5 oportunidades).

- [ ] **Step 5: Ejecutar el build**

```bash
npm run build
```

Esperado: compila sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/app/ventas/page.tsx
git commit -m "feat(ventas): surface pipeline bloqueos and prioridades de hoy on the Ventas page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 17: Verificación final completa

- [ ] **Step 1: Ejecutar el test suite completo**

```bash
cd "C:\Users\gance\Desktop\BLOQBASE\06_DASHBOARD\dashboard-bloqbase"
npm run test 2>&1
```

Esperado: los mismos 4 fallos preexistentes de `sheets.test.ts`/`queries.test.ts` no relacionados con este plan (verificar que no aumentaron), y todos los tests nuevos de este plan en verde. Cuenta esperada de tests nuevos: 5 (Task 1) + 4 (Task 2) + 1 (Task 3) + 2 (Task 4) + 1 (Task 5) + 4 (Task 7) + 2 (Task 8) + 4 (Task 12) + 3 (Task 13) + 2 (Task 14) + 3 (Task 15) = 31 tests nuevos.

- [ ] **Step 2: Build de producción**

```bash
npm run build
```

Esperado: compila sin errores de tipos, todas las rutas generan.

- [ ] **Step 3: Reiniciar dev server con caché limpia y probar las 3 páginas**

```bash
rm -rf .next
npm run dev
```

Navega a `/`, `/marketing`, `/ventas` y confirma:
- `/marketing`: dos bloques de IA (Tráfico/Atlas SEO, Contenido/Redes), sin colores fuera de la paleta Bloqbase
- `/ventas`: bloque de IA de llamadas + bloque nuevo de pipeline con bloqueos/prioridades
- Ningún bloque de IA muestra un diagnóstico inventado cuando el volumen de datos es bajo — debe decir "Sin suficiente señal"

- [ ] **Step 4: Confirmar consola del navegador sin errores nuevos**

Usa las devtools o Playwright para navegar las 3 páginas y confirmar 0 errores de consola (aparte del `DeprecationWarning` de Node/zlib ya conocido y no relacionado).

No hay commit en esta tarea — es solo verificación final de todo el plan.

---

## Self-Review

**Cobertura del alcance pedido:**
1. ✅ Regla "Sin suficiente señal" → Bloque 1 (motor) + Bloque 4 (aplicado a Marketing y Ventas existentes)
2. ✅ Baseline real vs. umbrales inventados → Bloque 2 (motor) + Task 8 (aplicado a Redes)
3. ✅ Vocabulario de estados por sección → Bloque 3 (`requiere_accion` soportado en tipos y componente) + usado en Task 15
4. ✅ Growth separado en submódulos → Bloque 5 (Web/Atlas y Redes implementados con datos reales; Newsletter/Cold Email/Ads documentados como pendientes de fuente de datos, no simulados)
5. ✅ Pipeline de Ventas de 6 etapas + bloqueos + prioridades de hoy → Bloque 6 completo

**Nota sobre Task 11:** se decidió no implementar Newsletter/Cold Email/Ads con datos falsos porque el propio documento (sección 12.5) prohíbe mostrar actividad simulada — "No conectado" es el estado correcto hasta que exista la integración de datos real. Esto es una decisión de scope explícita, no una brecha sin resolver.
