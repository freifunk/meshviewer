import { describe, expect, it } from "vitest";
import { escape } from "./escape.js";

describe("escape utility", () => {
  it("escapes all relevant HTML special characters", () => {
    expect(escape("<b>\"Test & Demo\"</b> & 'more'")).toBe(
      "&lt;b&gt;&#34;Test &amp; Demo&#34;&lt;/b&gt; &amp; &#39;more&#39;",
    );
  });

  it("handles string with no HTML characters without alteration", () => {
    expect(escape("Regular ASCII string 12345")).toBe("Regular ASCII string 12345");
  });

  it("escapes ampersands before other tags to avoid double encoding", () => {
    expect(escape("&lt;")).toBe("&amp;lt;");
  });
});
