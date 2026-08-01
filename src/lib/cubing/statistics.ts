import type { CubeQuantiles } from "./types";

export function geoDistrQuantile(p: number): CubeQuantiles {
  if (p <= 0) {
    return {
      mean: Infinity,
      median: Infinity,
      seventy_fifth: Infinity,
      eighty_fifth: Infinity,
      nintey_fifth: Infinity,
    };
  }
  return {
    mean: 1 / p,
    median: Math.log(1 - 0.5) / Math.log(1 - p),
    seventy_fifth: Math.log(1 - 0.75) / Math.log(1 - p),
    eighty_fifth: Math.log(1 - 0.85) / Math.log(1 - p),
    nintey_fifth: Math.log(1 - 0.95) / Math.log(1 - p),
  };
}
