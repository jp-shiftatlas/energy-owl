import { useState } from "react";
import AddressInput from "./components/AddressInput";
import DemoAddressChips from "./components/DemoAddressChips";
import ResultsPanel from "./components/ResultsPanel";
import {
  useSolarAnalysis,
  type AnalysisInput,
} from "./hooks/useSolarAnalysis";
import type { DemoAddress } from "./lib/demoAddresses";
import Scene from "./scene/Canvas";

export default function App() {
  const [inputValue, setInputValue] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisInput | null>(null);

  function handleAddressSubmit(address: string) {
    setAnalysis({ kind: "address", address });
  }

  function handleDemoSelect(a: DemoAddress) {
    setInputValue(a.address);
    setAnalysis({
      kind: "coords",
      address: a.address,
      lat: a.lat,
      lng: a.lng,
    });
  }

  const result = useSolarAnalysis(analysis);

  return (
    <div className="min-h-screen flex flex-col bg-forest text-offwhite">
      <header className="px-6 md:px-10 pt-8 pb-4 border-b border-sage/20">
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
          Energy Owl
        </h1>
        <p className="mt-2 text-sm md:text-base text-offwhite/70 max-w-xl">
          Drop a US commercial address. Get a 3D roof, production estimates,
          and an AI-generated narrative report.
        </p>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(320px,420px)_1fr] gap-6 px-6 md:px-10 py-8">
        <section className="flex flex-col gap-6">
          <div className="rounded-lg border border-sage/20 bg-forest p-5 flex flex-col gap-5">
            <AddressInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleAddressSubmit}
            />
            <DemoAddressChips onSelect={handleDemoSelect} />
          </div>
          <div className="rounded-lg border border-sage/20 bg-forest p-5">
            <ResultsPanel analysis={result} />
          </div>
        </section>

        <section className="rounded-lg border border-sage/20 bg-forest min-h-[420px] overflow-hidden">
          <Scene buildingInsights={result.googleSolar.data ?? null} />
        </section>
      </div>

      <footer className="px-6 md:px-10 py-4 border-t border-sage/20 text-xs text-offwhite/40 font-mono">
        shiftatlas.tech · portfolio demo
      </footer>
    </div>
  );
}
