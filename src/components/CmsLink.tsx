import type { AnchorHTMLAttributes, ReactNode } from "react";
import { canonicalUrl, isExternalUrl } from "@/lib/storefrontContent";

/** Link for admin-edited destinations: unsafe values render as plain text; uses the canonical trimmed URL; external links open in a new tab with rel protections. */
export function CmsLink({ href, children, ...rest }: { href: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel">) {
  const url = canonicalUrl(href ?? "");
  if (!url) return <span {...(rest as any)}>{children}</span>;
  return isExternalUrl(url) ? (
    <a href={url} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>
  ) : (
    <a href={url} {...rest}>{children}</a>
  );
}
