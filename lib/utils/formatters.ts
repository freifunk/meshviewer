import { Moment } from "moment";

export const sortByKey = function sortByKey<K extends string, T extends Record<K, Moment>>(key: K, data: T[]): T[] {
  return data.sort(function (a, b) {
    return b[key].unix() - a[key].unix();
  });
};

export const limit = function limit<K extends string, T extends Record<K, { isAfter: (p: Moment) => boolean }>>(
  key: K,
  moment: Moment,
  data: T[],
): T[] {
  return data.filter(function (entry) {
    return entry[key].isAfter(moment);
  });
};

export const sum = function sum(items: number[]) {
  return items.reduce(function (a, b) {
    return a + b;
  }, 0);
};

export const one = function one() {
  return 1;
};

export const dictGet = function dictGet(dict: { [x: string]: any }, keys: string[]) {
  const key = keys.shift();
  if (key === undefined || !(key in dict)) {
    return null;
  }

  if (keys.length === 0) {
    return dict[key];
  }

  return dictGet(dict[key], keys);
};

export const collapseWhitespace = function collapseWhitespace(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/\s+/g, " ").trim();
};

export const normalizeFilterValue = function normalizeFilterValue(value: unknown) {
  return collapseWhitespace(value).toLowerCase();
};

// The sort makes the most common spelling win the label, deterministically.
export const mergeSpellingVariants = function mergeSpellingVariants(counts: Map<unknown, number>) {
  const merged = new Map<string, [string, number]>();

  [...counts]
    .sort(function (a, b) {
      return b[1] - a[1] || (String(a[0]) < String(b[0]) ? -1 : 1);
    })
    .forEach(function ([value, count]) {
      const key = normalizeFilterValue(value);
      const group = merged.get(key);

      if (group === undefined) {
        merged.set(key, [collapseWhitespace(value), count]);
      } else {
        group[1] += count;
      }
    });

  return [...merged.values()];
};

export const listReplace = function listReplace(template: string, subst: ReplaceMapping) {
  for (const [key, value] of Object.entries(subst)) {
    let re = new RegExp(key, "g");
    template = template.replace(re, value);
  }
  return template;
};

export const showDistance = function showDistance(data: { distance: number }) {
  if (isNaN(data.distance)) {
    return "";
  }

  return data.distance.toFixed(0) + " m";
};

export const showTq = function showTq(tq: number) {
  return (tq * 100).toFixed(0) + "%";
};
