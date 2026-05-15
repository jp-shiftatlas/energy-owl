import { useQuery } from "@tanstack/react-query";
import { geocode, type GeocodeResult } from "../lib/apis/geocoder";
import { fetchPvwatts, type PvwattsResult } from "../lib/apis/pvwatts";
import {
  fetchDailyIrradiance,
  type DailyIrradiance,
} from "../lib/apis/openMeteo";

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
  isIdle: boolean;
};

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

  const pvwattsQuery = useQuery({
    queryKey: ["pvwatts", coords?.lat, coords?.lng],
    queryFn: () => fetchPvwatts({ lat: coords!.lat, lng: coords!.lng }),
    enabled: !!coords,
  });

  const openMeteoQuery = useQuery({
    queryKey: ["openMeteo", coords?.lat, coords?.lng],
    queryFn: () => fetchDailyIrradiance({ lat: coords!.lat, lng: coords!.lng }),
    enabled: !!coords,
  });

  return {
    coords: {
      data: coords,
      isLoading: input?.kind === "address" ? geocodeQuery.isLoading : false,
      isError: input?.kind === "address" ? geocodeQuery.isError : false,
      error: input?.kind === "address" ? geocodeQuery.error : null,
    },
    pvwatts: {
      data: pvwattsQuery.data,
      isLoading:
        pvwattsQuery.isLoading && pvwattsQuery.fetchStatus !== "idle",
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
    isIdle: input === null,
  };
}
