const relativeNowPattern = /^@now((?:[+-]\d+[smhdw])*)$/;

const unitToMilliseconds = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

export function parseRelativeNow(value, now) {
  const match = relativeNowPattern.exec(value);

  if (!match) {
    return value;
  }

  const date = new Date(now);
  const offsets = match[1].match(/[+-]\d+[smhdw]/g) ?? [];

  for (const offset of offsets) {
    const sign = offset[0] === "+" ? 1 : -1;
    const amount = Number.parseInt(offset.slice(1, -1), 10);
    const unit = offset.at(-1);

    date.setTime(date.getTime() + sign * amount * unitToMilliseconds[unit]);
  }

  return date.toISOString();
}

export function resolveRelativeFixtureTimes(value, now = new Date()) {
  if (typeof value === "string") {
    return parseRelativeNow(value, now);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveRelativeFixtureTimes(entry, now));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, resolveRelativeFixtureTimes(entry, now)]),
    );
  }

  return value;
}
