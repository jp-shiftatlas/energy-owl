import { useQuery } from "@tanstack/react-query";
import { geocode, type GeocodeResult } from "../lib/apis/geocoder";
import {
  fetchPvwatts,
  FALLBACK_SYSTEM_CAPACITY_KW,
  type PvwattsResult,
} from "../lib/apis/pvwatts";
import {
  fetchDailyIrradiance,
  type DailyIrradiance,
} from "../lib/apis/openMeteo";
import {
  fetchBuildingInsights,
  type BuildingInsights,
} from "../lib/apis/googleSolar";

export type AnalysisInput =
  | { kind: "address"; address: string }
  | { kind: "coords"; address: string; lat: number; lng: number };

type QueryState<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export type SolarAnalysis = {
  coords: QueryState<GeocodeResult>;
  pvwatts: QueryState<PvwattsResult>;
  openMeteo: QueryState<DailyIrradiance>;
  googleSolar: QueryState<BuildingInsights>;
  systemCapacityKw: number;
  isIdle: boolean;
};

function deriveSystemCapacityKw(data: BuildingInsights | undefined): number {
  if (!data) return FALLBACK_SYSTEM_CAPACITY_KW;
  const { maxArrayPanelsCount, panelCapacityWatts } = data.solarPotential;
  return Math.round((maxArrayPanelsCount * panelCapacityWatts) / 1000);
}

export function useSolarAnalysis(input: AnalysisInput | null): SolarAnalysis {
  const geocodeQuery = useQuery({
    queryKey: ["geocode", input?.kind === "address" ? input.address : null],
    queryFn: () => {
      if (!input || input.kind !== "address") {
        throw new Error("unreachable");
      }
      return geocode(input.address);
    },
    enabled: input?.kind === "address",
  });

  const coords: GeocodeResult | undefined =
    input?.kind === "coords"
      ? { lat: input.lat, lng: input.lng, matchedAddress: input.address }
      : geocodeQuery.data;

  const googleSolarQuery = useQuery({
    queryKey: ["googleSolar", coords?.lat, coords?.lng],
    queryFn: () =>
      fetchBuildingInsights({ lat: coords!.lat, lng: coords!.lng }),
    enabled: !!coords,
    retry: false,
  });

  const systemCapacityKw = deriveSystemCapacityKw(googleSolarQuery.data);

  const pvwattsQuery = useQuery({
    queryKey: ["pvwatts", coords?.lat, coords?.lng, systemCapacityKw],
    queryFn: () =>
      fetchPvwatts({
        lat: coords!.lat,
        lng: coords!.lng,
        systemCapacityKw,
      }),
    // Wait until Google Solar has settled (success OR error) so the
    // capacity passed to PVWatts is final — no flicker between the
    // 100 kW fallback estimate and the roof-derived one.
    enabled: !!coords && googleSolarQuery.isFetched,
  });

  const openMeteoQuery = useQuery({
    queryKey: ["openMeteo", coords?.lat, coords?.lng],
    queryFn: () => fetchDailyIrradiance({ lat: coords!.lat, lng: coords!.lng }),
    enabled: !!coords,
  });

  const pvwattsIsFetching =
    pvwattsQuery.isLoading && pvwattsQuery.fetchStatus !== "idle";
  const pvwattsIsWaitingOnSolar = !!coords && !googleSolarQuery.isFetched;

  return {
    coords: {
      data: coords,
      isLoading: input?.kind === "address" ? geocodeQuery.isLoading : false,
      isError: input?.kind === "address" ? geocodeQuery.isError : false,
      error: input?.kind === "address" ? geocodeQuery.error : null,
    },
    pvwatts: {
      data: pvwattsQuery.data,
      isLoading: pvwattsIsFetching || pvwattsIsWaitingOnSolar,
      isError: pvwattsQuery.isError,
      error: pvwattsQuery.error,
    },
    openMeteo: {
      data: openMeteoQuery.data,
      isLoading:
        openMeteoQuery.isLoading && openMeteoQuery.fetchStatus !== "idle",
      isError: openMeteoQuery.isError,
      error: openMeteoQuery.error,
    },
    googleSolar: {
      data: googleSolarQuery.data,
      isLoading:
        googleSolarQuery.isLoading && googleSolarQuery.fetchStatus !== "idle",
      isError: googleSolarQuery.isError,
      error: googleSolarQuery.error,
    },
    systemCapacityKw,
    isIdle: input === null,
  };
}
