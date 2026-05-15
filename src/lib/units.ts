export function mjPerM2ToKwhPerM2(mj: number): number {
  return mj / 3.6;
}

export function secondsToHours(s: number): number {
  return Math.round((s / 3600) * 10) / 10;
}

export function formatKwh(kwh: number): string {
  return Math.round(kwh).toLocaleString("en-US");
}

export function formatPercent(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function formatHours(h: number): string {
  return `${h.toFixed(1)} h`;
}

export function formatKwhPerM2(kwh: number): string {
  return `${kwh.toFixed(2)} kWh/m²`;
}
