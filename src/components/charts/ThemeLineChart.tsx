"use client";

import { useEffect, useRef } from "react";
import type { ECharts } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { subscribeThemePrefs } from "@/lib/theme";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

function readColor(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Apache ECharts basic line chart + Axis Align with Tick
 * (category x-axis, axisTick.alignWithLabel).
 */
export function ThemeLineChart({
  labels,
  values,
  height,
  yFormatter,
  valueFormatter,
}: {
  labels: string[];
  values: number[];
  height: number;
  yFormatter?: (value: number) => string;
  valueFormatter?: (value: number) => string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const yRef = useRef(yFormatter);
  const vRef = useRef(valueFormatter);
  yRef.current = yFormatter;
  vRef.current = valueFormatter;
  const labelsKey = labels.join("\0");
  const valuesKey = values.join(",");

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
            axisPointer: { type: "line" },
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
          yAxis: {
            type: "value",
            axisLabel: {
              color: muted,
              fontSize: 11,
              formatter: fmtY,
            },
            splitLine: {
              lineStyle: { color: border, opacity: 0.55 },
            },
            axisLine: { show: false },
          },
          series: [
            {
              type: "line",
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
          ],
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
  }, [labelsKey, valuesKey]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label="Line chart"
      style={{ height }}
      className="w-full"
    />
  );
}
