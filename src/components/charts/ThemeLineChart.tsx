"use client";

import { useEffect, useRef } from "react";
import type { ECharts } from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { subscribeThemePrefs } from "@/lib/theme";

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
]);

function readColor(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Theme-aware ECharts line or bar chart (category x-axis, ticks aligned).
 * Optional yMin/yMax pin the value axis (e.g. level progress start→end).
 */
export function ThemeLineChart({
  labels,
  values,
  height,
  yFormatter,
  valueFormatter,
  type = "line",
  yMin,
  yMax,
}: {
  labels: string[];
  values: number[];
  height: number;
  yFormatter?: (value: number) => string;
  valueFormatter?: (value: number) => string;
  type?: "line" | "bar";
  yMin?: number;
  yMax?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const yRef = useRef(yFormatter);
  const vRef = useRef(valueFormatter);
  yRef.current = yFormatter;
  vRef.current = valueFormatter;
  const labelsKey = labels.join("\0");
  const valuesKey = values.join(",");
  const rangeKey = `${yMin ?? ""}:${yMax ?? ""}`;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const chart = echarts.init(host, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const axisLabels = labelsKey === "" ? [] : labelsKey.split("\0");
    const yValues = valuesKey ? valuesKey.split(",").map(Number) : [];

    const apply = () => {
      const accent = readColor(host, "--accent", "#3b82f6");
      const muted = readColor(host, "--muted-foreground", "#b3b3b3");
      const border = readColor(host, "--border", "#2e2e2e");
      const fg = readColor(host, "--foreground", "#f5f5f5");
      const fmtY = yRef.current;
      const fmtV = vRef.current;

      const yAxis: Record<string, unknown> = {
        type: "value",
        scale: type === "line",
        axisLabel: {
          color: muted,
          fontSize: 11,
          formatter: fmtY,
        },
        splitLine: {
          lineStyle: { color: border, opacity: 0.55 },
        },
        axisLine: { show: false },
      };
      if (yMin != null && Number.isFinite(yMin)) yAxis.min = yMin;
      if (yMax != null && Number.isFinite(yMax)) yAxis.max = yMax;

      const series =
        type === "bar"
          ? [
              {
                type: "bar" as const,
                data: yValues,
                barMaxWidth: 28,
                itemStyle: {
                  color: accent,
                  borderRadius: [3, 3, 0, 0],
                },
                emphasis: {
                  itemStyle: { color: fg },
                },
              },
            ]
          : [
              {
                type: "line" as const,
                data: yValues,
                showSymbol: true,
                symbol: "circle",
                symbolSize: 7,
                lineStyle: { width: 2, color: accent },
                itemStyle: { color: accent },
                emphasis: {
                  itemStyle: { borderColor: fg, borderWidth: 2 },
                },
              },
            ];

      chart.setOption(
        {
          animationDuration: 280,
          grid: {
            left: "3%",
            right: "4%",
            top: 12,
            bottom: "3%",
            containLabel: true,
          },
          tooltip: {
            trigger: "axis",
            axisPointer: { type: type === "bar" ? "shadow" : "line" },
            valueFormatter: fmtV
              ? (v: unknown) => fmtV(Number(v))
              : undefined,
          },
          xAxis: {
            type: "category",
            data: axisLabels,
            boundaryGap: true,
            axisTick: { alignWithLabel: true },
            axisLine: { lineStyle: { color: border } },
            axisLabel: {
              color: muted,
              hideOverlap: true,
              fontSize: 11,
            },
          },
          yAxis,
          series,
        },
        true,
      );
    };

    apply();
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(host);
    const unsub = subscribeThemePrefs(() => {
      apply();
    });

    return () => {
      unsub();
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [labelsKey, valuesKey, type, rangeKey, yMin, yMax]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={type === "bar" ? "Bar chart" : "Line chart"}
      style={{ height }}
      className="w-full"
    />
  );
}
