import type { CSSProperties } from "react";
import { cmsValues, canonicalUrl } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { CmsLink } from "./CmsLink";

export function announcementTopics(
  content: Record<string, string> | undefined,
) {
  const c = cmsValues(content, "home_announcements");
  const topics = (
    c.topics as { text: string; url?: string; visible?: boolean }[]
  )
    .filter((topic) => topic.visible !== false && topic.text.trim())
    .map((topic) => ({
      text: topic.text.trim(),
      url: canonicalUrl(topic.url || ""),
    }));
  return {
    visible: Boolean(c.visible) && topics.length > 0,
    speed: c.speed as string,
    topics,
  };
}

export function HomeAnnouncementBanner() {
  const { data } = useSiteContent();
  const { visible, speed, topics } = announcementTopics(data);
  if (!visible) return null;
  const seconds =
    Math.max(
      22,
      topics.reduce((sum, t) => sum + t.text.length * 0.16 + 1.2, 0),
    ) / (speed === "fast" ? 1.5 : speed === "slow" ? 0.7 : 1);
  return (
    <aside className="titan-announcements" aria-label="Titan announcements">
      <div className="titan-announcement-window">
        <div
          className="titan-announcement-track"
          style={{ "--announcement-duration": `${seconds}s` } as CSSProperties}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="titan-announcement-group"
              aria-hidden={copy === 1 ? true : undefined}
            >
              {topics.map((topic, i) => (
                <span key={i} className="titan-announcement-topic">
                  <img
                    src="/images/titan-announcement-shield.webp"
                    alt=""
                    aria-hidden="true"
                    width={24}
                    height={24}
                  />
                  {topic.url ? (
                    <CmsLink
                      href={topic.url}
                      tabIndex={copy === 1 ? -1 : undefined}
                    >
                      {topic.text}
                    </CmsLink>
                  ) : (
                    <span>{topic.text}</span>
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
