import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getJSON } from "../utils/helper.js";
import { location } from "./location.js";

vi.mock("../utils/language.js", () => ({ _: { t: (key: string) => key, locale: () => "en" } }));
vi.mock("../utils/helper.js", () => ({ getJSON: vi.fn() }));

interface FakeElement {
  tagName: string;
  textContent: string;
  siblings: FakeElement[];
  [key: string]: unknown;
}

const createElement = (tagName: string): FakeElement => {
  const elem: FakeElement = {
    tagName,
    textContent: "",
    siblings: [],
    classList: { add: () => {} },
    setAttribute: () => {},
    appendChild: () => {},
    after(sibling: FakeElement) {
      elem.siblings.push(sibling);
    },
  };
  return elem;
};

describe("location", () => {
  let title: FakeElement | undefined;

  beforeEach(() => {
    title = undefined;
    vi.stubGlobal("window", { config: { reverseGeocodingApi: "https://geocoder.example/reverse" } });
    vi.stubGlobal("document", {
      createElement(tagName: string) {
        const elem = createElement(tagName);
        title ??= elem;
        return elem;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the reverse geocoded address as text", async () => {
    const payload = "<img src=x onerror=alert(1)>";
    vi.mocked(getJSON).mockResolvedValue({ display_name: payload });

    location(createElement("div") as unknown as HTMLElement, { lat: 50.1, lng: 8.6, zoom: 18 });
    await vi.waitFor(() => expect(title?.siblings).toHaveLength(1));

    expect(title?.siblings[0]).toMatchObject({ tagName: "p", textContent: payload });
    expect(title).not.toHaveProperty("outerHTML");
  });
});
