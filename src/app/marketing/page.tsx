import { NavBar } from "@/core/components/NavBar";
import { Tabs, type TabItem } from "@/core/components/Tabs";
import { buildMarketingSnapshot } from "@/modules/marketing/lib/queries";
import { ResumenTab } from "@/modules/marketing/components/ResumenTab";
import { WebTab } from "@/modules/marketing/components/WebTab";
import { RedesTab } from "@/modules/marketing/components/RedesTab";
import { NewsletterTab } from "@/modules/marketing/components/NewsletterTab";

export const dynamic = "force-dynamic";

const TAB_ITEMS: TabItem[] = [
  { key: "resumen", label: "Resumen" },
  { key: "web", label: "Web" },
  { key: "redes", label: "Redes" },
  { key: "newsletter", label: "Newsletter" },
  { key: "cold-email", label: "Cold Email", disabled: true, disabledLabel: "No conectado" },
  { key: "ads", label: "Ads", disabled: true, disabledLabel: "No conectado" },
];

const VALID_TABS = new Set(["resumen", "web", "redes", "newsletter"]);

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sitio?: string }>;
}) {
  const { tab, sitio } = await searchParams;
  const activeTab = tab && VALID_TABS.has(tab) ? tab : "resumen";
  const activeSitio = sitio === "atlas" ? "atlas" : "bloqbase";

  let snapshot = null;
  try {
    snapshot = await buildMarketingSnapshot();
  } catch (err) {
    console.error("[marketing page] failed to build snapshot", err);
  }

  return (
    <div>
      <NavBar />
      <div className="bq-wrap">
        <div className="bq-eyebrow">Marketing y contenido</div>
        <div className="bq-h1">Marketing</div>
        <div className="mt-[14px] max-w-[560px] text-[13.5px] leading-[1.6] text-[rgba(26,26,24,0.58)]">
          Del tráfico que entra a la web, al contenido que lo sostiene, a la conversión que produce.
        </div>

        <Tabs items={TAB_ITEMS} activeKey={activeTab} basePath="/marketing" />

        {activeTab === "resumen" && <ResumenTab snapshot={snapshot} />}
        {activeTab === "web" && <WebTab snapshot={snapshot} sitio={activeSitio} />}
        {activeTab === "redes" && <RedesTab snapshot={snapshot} />}
        {activeTab === "newsletter" && <NewsletterTab snapshot={snapshot} />}
      </div>
    </div>
  );
}
