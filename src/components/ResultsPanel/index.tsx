import type { SolarAnalysis } from "../../hooks/useSolarAnalysis";
import { GeocoderError } from "../../lib/apis/geocoder";
import {
  formatHours,
  formatKwh,
  formatKwhPerM2,
  formatPercent,
  mjPerM2ToKwhPerM2,
  secondsToHours,
} from "../../lib/units";
import StatTile from "./StatTile";

type Props = {
  analysis: SolarAnalysis;
};

function coordsMessage(error: unknown): string {
  if (error instanceof GeocoderError && error.kind === "no_match") {
    return "Couldn't find that address. Try including the city and state.";
  }
  return "Address lookup is briefly unavailable.";
}

export default function ResultsPanel({ analysis }: Props) {
  if (analysis.isIdle) {
    return (
      <p className="text-sm text-offwhite/60">
        Submit an address to see production estimates.
      </p>
    );
  }

  if (analysis.coords.isLoading) {
    return <p className="text-sm text-offwhite/60">Locating address…</p>;
  }

  if (analysis.coords.isError || !analysis.coords.data) {
    return (
      <p className="text-sm text-offwhite/70">
        {coordsMessage(analysis.coords.error)}
      </p>
    );
  }

  const pv = analysis.pvwatts;
  const om = analysis.openMeteo;

  const pvState: "loading" | "ok" | "unavailable" = pv.isLoading
    ? "loading"
    : pv.isError || !pv.data
      ? "unavailable"
      : "ok";
  const omState: "loading" | "ok" | "unavailable" = om.isLoading
    ? "loading"
    : om.isError || !om.data
      ? "unavailable"
      : "ok";

  const todayKwhPerM2 = om.data
    ? mjPerM2ToKwhPerM2(om.data.shortwaveMjPerM2)
    : 0;
  const todayHours = om.data ? secondsToHours(om.data.sunshineSeconds) : 0;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-offwhite/50 mb-2 font-mono">
        {analysis.coords.data.matchedAddress}
      </p>

      <StatTile
        label="Annual production (100 kW system)"
        value={pv.data ? formatKwh(pv.data.acAnnualKwh) : ""}
        unit="kWh / year"
        state={pvState}
        message="Production estimate unavailable."
      />

      <StatTile
        label="Capacity factor"
        value={pv.data ? formatPercent(pv.data.capacityFactorPercent) : ""}
        state={pvState}
        message="Production estimate unavailable."
      />

      <StatTile
        label="Today's irradiance"
        value={om.data ? formatKwhPerM2(todayKwhPerM2) : ""}
        state={omState}
        message="Today's irradiance is unavailable."
      />

      <StatTile
        label="Today's sunshine"
        value={om.data ? formatHours(todayHours) : ""}
        state={omState}
        message="Today's sunshine is unavailable."
      />

      {pv.data ? (
        <p className="text-xs text-offwhite/40 mt-3 font-mono">
          NREL station: {pv.data.stationCity}, {pv.data.stationState}
        </p>
      ) : null}

      <p className="text-xs text-offwhite/30 mt-2 italic">
        100 kW assumption; replaced with roof-derived capacity in S3.
      </p>
    </div>
  );
}
