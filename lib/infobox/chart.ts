import { classModule, eventListenersModule, h, init, propsModule, styleModule, VNode } from "snabbdom";

const patch = init([classModule, propsModule, styleModule, eventListenersModule]);
import { select } from "d3-selection";
import { scaleTime, scaleLinear, NumberValue } from "d3-scale";
import { axisBottom, axisLeft } from "d3-axis";
import { line, curveMonotoneX } from "d3-shape";
import { timeFormat } from "d3-time-format";
import { format as d3Format } from "d3-format";
import { schemeTableau10 } from "d3-scale-chromatic";
import { _ } from "../utils/language.js";
import { Chart, ChartSeries } from "../config_default.js";

interface Series {
  name: string;
  points: { t: Date; v: number | null }[];
}

interface ParsedChart {
  series: Series[];
  xDomain: [number, number];
  yDomain: [number, number];
}

function parseRelativeMs(t: string): number {
  if (t === "now") return Date.now();
  const m = t.match(/^now-(\d+)([smhdwMy])$/);
  if (!m) return Date.now();
  const v = parseInt(m[1], 10);
  const mult: Record<string, number> = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5, M: 2592e6, y: 3154e7 };
  return Date.now() - v * (mult[m[2]] ?? 1e3);
}

function applySubst(query: string, subst: Record<string, string>): string {
  let q = query;
  for (const [k, v] of Object.entries(subst)) {
    q = q.split("$" + k).join(v);
  }
  return q;
}

async function fetchChartData(
  grafanaUrl: string,
  orgId: number,
  chart: Chart,
  subst: Record<string, string>,
): Promise<any> {
  const fromStr = chart.from ?? "now-7d";
  const toStr = chart.to ?? "now-1m";
  const maxDataPoints = chart.maxDataPoints ?? 300;
  const intervalMs = Math.max(1000, Math.floor((parseRelativeMs(toStr) - parseRelativeMs(fromStr)) / maxDataPoints));

  // Static fixture deployment (GitHub pages) only serves GET requests
  if (chart.datasourceType === "fixture") {
    const response = await fetch(`./${chart.datasourceUid}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  const query = applySubst(chart.query, subst);

  const response = await fetch(`${grafanaUrl}/api/ds/query?ds_type=${encodeURIComponent(chart.datasourceType)}`, {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    headers: {
      "content-type": "application/json",
      "x-datasource-uid": chart.datasourceUid,
      "x-grafana-org-id": String(orgId),
    },
    body: JSON.stringify({
      queries: [
        {
          datasource: { type: chart.datasourceType, uid: chart.datasourceUid },
          rawQuery: true,
          query,
          // prometheus-family plugins (prometheus, victoriametrics) read expr/range
          // instead of query/rawQuery; we hope each plugin ignores the other model's fields
          expr: query,
          range: true,
          refId: "A",
          resultFormat: "time_series",
          intervalMs,
          maxDataPoints,
        },
      ],
      from: fromStr,
      to: toStr,
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function parseResults(results: Record<string, any>, configMap: Map<string, ChartSeries>): ParsedChart {
  const series: Series[] = [];
  let tMin = Infinity,
    tMax = -Infinity;
  let vMin = Infinity,
    vMax = -Infinity;

  for (const refId of Object.keys(results)) {
    const frames = results[refId]?.frames;
    if (!frames?.length) continue;
    for (const frame of frames) {
      const rawName = frame.schema?.name || frame.schema?.fields?.[1]?.config?.displayNameFromDS || refId;
      const name = rawName.replace(/^\w+\./, "");
      const timestamps: number[] = frame.data?.values?.[0] ?? [];
      const raw: (number | null)[] = frame.data?.values?.[1] ?? [];
      const negate = configMap.get(name)?.negate ?? false;
      const points = timestamps.map((ts, j) => {
        const r = raw[j] ?? null;
        const v = negate && r !== null ? -r : r;
        if (ts < tMin) tMin = ts;
        if (ts > tMax) tMax = ts;
        if (v !== null) {
          if (v < vMin) vMin = v;
          if (v > vMax) vMax = v;
        }
        return { t: new Date(ts), v };
      });
      series.push({ name, points });
    }
  }

  return {
    series,
    xDomain: [tMin, tMax],
    yDomain: [Math.min(vMin, 0), Math.max(vMax, 1)],
  };
}

function renderD3Chart(
  container: HTMLElement,
  parsed: ParsedChart,
  spec: string,
  suffix: string,
  configMap: Map<string, ChartSeries> = new Map(),
) {
  const { series: seriesList, xDomain, yDomain } = parsed;
  const seriesColor = (s: Series, i: number) =>
    configMap.get(s.name)?.color ?? schemeTableau10[i % schemeTableau10.length];

  const innerWidth = 440;
  const marginTop = 16,
    marginRight = 15,
    marginBottom = 28;
  const innerHeight = 200 - marginTop - marginBottom; // 156

  const xScale = scaleTime().domain(xDomain).range([0, innerWidth]);

  const yScale = scaleLinear().domain(yDomain).nice().range([innerHeight, 0]);

  const fmt = suffix ? (v: NumberValue) => d3Format(spec)(v) + suffix : d3Format(spec);

  const yAxis = axisLeft(yScale)
    .ticks(4)
    .tickFormat((d) => fmt(d));

  // Probe y-axis label width by rendering into a temporary SVG in the DOM
  const svgEl = select(container).append("svg").attr("width", "100%");
  const probeG = svgEl.append("g").call(yAxis);
  const marginLeft = Math.ceil(-(probeG.node() as SVGGElement).getBBox().x) + 6;
  probeG.remove();

  // Final viewBox now that we know the true left margin
  const vbWidth = marginLeft + innerWidth + marginRight;
  const vbHeight = marginTop + innerHeight + marginBottom;
  svgEl.attr("viewBox", `0 0 ${vbWidth} ${vbHeight}`);

  svgEl.append("rect").attr("width", vbWidth).attr("height", vbHeight).attr("class", "node-chart-bg");

  const svg = svgEl.append("g").attr("transform", `translate(${marginLeft},${marginTop})`);

  // Horizontal grid lines
  svg
    .append("g")
    .attr("class", "node-chart-grid")
    .call(
      axisLeft(yScale)
        .ticks(4)
        .tickSize(-innerWidth)
        .tickFormat(() => ""),
    );

  svg
    .append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      axisBottom(xScale)
        .ticks(5)
        .tickFormat(timeFormat("%m/%d") as (d: Date | { valueOf(): number }) => string),
    );
  svg.append("g").call(yAxis);

  const lineFn = line<{ t: Date; v: number | null }>()
    .defined((d) => d.v !== null)
    .curve(curveMonotoneX)
    .x((d) => xScale(d.t))
    .y((d) => yScale(d.v!));

  seriesList.forEach((s, i) => {
    svg
      .append("path")
      .datum(s.points)
      .attr("fill", "none")
      .attr("stroke", seriesColor(s, i))
      .attr("stroke-width", 1.5)
      .attr("d", lineFn);
  });

  // Stats table
  const fmtOrDash = (v: number | null) => (v !== null ? fmt(v) : "–");
  const nonNull = (vals: (number | null)[]) => vals.filter((v): v is number => v !== null);

  const rows = seriesList.map((s, i) => {
    const vals = nonNull(s.points.map((p) => p.v));
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const last = s.points.reduceRight((acc: number | null, p) => (acc !== null ? acc : p.v), null);
    const max = vals.length ? Math.max(...vals) : null;
    const min = vals.length ? Math.min(...vals) : null;
    return h("tr", [
      h("td", [
        h("span", { props: { className: "node-chart-stats-color" }, style: { background: seriesColor(s, i) } }),
      ]),
      h("td", s.name),
      h("td", fmtOrDash(mean)),
      h("td", fmtOrDash(last)),
      h("td", fmtOrDash(max)),
      h("td", fmtOrDash(min)),
    ]);
  });

  const tableVnode = h("table", { props: { className: "node-chart-stats" } }, [
    h("thead", [
      h(
        "tr",
        ["", "Name", "Mean", "Last", "Max", "Min"].map((t) => h("th", t)),
      ),
    ]),
    h("tbody", rows),
  ]);

  const tableEl = document.createElement("div");
  container.appendChild(tableEl);
  patch(tableEl, tableVnode);
}

export function createChartVNode(chart: Chart, subst: Record<string, string>): VNode {
  const grafana = window.config.grafana;
  if (!grafana) {
    console.warn(`Grafana config missing`);
    return h("div");
  }

  const grafanaUrl = grafana.url.replace(/\/$/, "");
  const orgId = grafana.orgId ?? 1;

  return h("div", {
    class: { "node-chart": true },
    hook: {
      insert: async (vnode: VNode) => {
        const el = vnode.elm as HTMLElement;
        el.textContent = _.t("loading", { name: chart.name });
        try {
          const json = await fetchChartData(grafanaUrl, orgId, chart, subst);
          el.textContent = "";
          const configMap = new Map((chart.series ?? []).map((s) => [s.name, s]));
          const parsed = parseResults(json.results ?? {}, configMap);
          if (parsed.series.length === 0 || !Number.isFinite(parsed.xDomain[0])) {
            el.textContent = _.t("node.chartNoData", { name: chart.name });
            return;
          }
          renderD3Chart(el, parsed, chart.format ?? ".2~s", chart.unitSuffix ?? "", configMap);
        } catch {
          el.textContent = _.t("node.chartError", { name: chart.name });
        }
      },
    },
  });
}
