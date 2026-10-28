import { describe, test, expect } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cmsKey,
  validateSection,
  cmsValues,
  mergeSectionChanges,
} from "../src/lib/storefrontContent";
import {
  announcementTopics,
  HomeAnnouncementBanner,
} from "../src/components/HomeAnnouncementBanner";
const key = cmsKey("home_announcements");
function render(value: unknown) {
  const client = new QueryClient();
  client.setQueryData(["site-content"], { [key]: JSON.stringify(value) });
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(HomeAnnouncementBanner),
    ),
  );
}
describe("homepage announcement banner", () => {
  test("owner can add and reorder a large topic list and keep the save conflict checks", () => {
    const topics = Array.from({ length: 100 }, (_, i) => ({
      text: `Topic ${i}`,
      url: "",
      visible: true,
    }));
    expect(
      validateSection("home_announcements", { topics }).topics,
    ).toHaveLength(100);
    const value = { topics: [topics[2], topics[0]] };
    expect(
      announcementTopics({ [key]: JSON.stringify(value) }).topics.map(
        (t) => t.text,
      ),
    ).toEqual(["Topic 2", "Topic 0"]);
    expect(() =>
      mergeSectionChanges(
        "home_announcements",
        JSON.stringify({ topics: [topics[1]] }),
        { topics },
        { topics: [] },
      ),
    ).toThrow();
  });
  test("empty, hidden topics and unsafe links never become clickable", () => {
    const result = announcementTopics({
      [key]: JSON.stringify({
        topics: [
          { text: "  " },
          { text: "Hidden", visible: false },
          { text: "Safe text", url: "" },
        ],
      }),
    });
    expect(result.topics).toEqual([{ text: "Safe text", url: "" }]);
    expect(() =>
      validateSection("home_announcements", {
        topics: [{ text: "Bad", url: "javascript:alert(1)" }],
      }),
    ).toThrow();
    expect(render({ topics: [] })).toBe("");
    expect(render({ visible: false })).toBe("");
  });
  test("duplicates are inaccessible, with a real shield separator and pause control", () => {
    const html = render({
      topics: [
        { text: "Shop", url: "/range" },
        { text: "Certificates", url: "/certificates" },
      ],
    });
    expect(html).toContain('aria-label="Pause announcements"');
    expect(html).toContain('aria-hidden="true"');
    expect((html.match(/tabindex="-1"/g) || []).length).toBe(2);
    expect(html).toContain("/images/titan-announcement-shield.webp");
    expect(html).not.toContain("New members receive");
  });
  test("default banner does not promise discounts or fixed shipping thresholds", () => {
    const text = JSON.stringify(cmsValues({}, "home_announcements"));
    expect(text).not.toMatch(/10%|\$200|free shipping/i);
  });
});
