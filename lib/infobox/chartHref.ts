import { Chart } from "../config_default.js";

// Matches only the complete placeholder names, so URL variables such as
// `$topic` or `$node_id` stay untouched. A single pass also means substituted
// values are never interpreted as placeholders themselves. Values end up in URL
// path segments and query parameters, so they are percent-encoded here; query
// expressions keep their raw values instead, because the datasource interprets
// them.
const PLACEHOLDER = /\$(node|source|target|from|to)\b/g;

export function buildChartHref(chart: Chart, subst: Record<string, string>): string | undefined {
  if (!chart.href) {
    return undefined;
  }
  const values: Record<string, string> = {
    ...subst,
    from: chart.from ?? "now-7d",
    to: chart.to ?? "now-1m",
  };
  return chart.href.replace(PLACEHOLDER, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : encodeURIComponent(value);
  });
}
