import type { AnchorHTMLAttributes, ReactNode } from "react";
import { isExternalUrl, isSafeUrl } from "@/lib/storefrontContent";

/** Link for admin-edited destinations: unsafe values render as plain text; external links open in a new tab with rel protections. */
export function CmsLink({ href, children, ...rest }: { href: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel">) {
  if (!href || !isSafeUrl(href)) return <span {...(rest as any)}>{children}</span>;
  return isExternalUrl(href) ? (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>
  ) : (
    <a href={href} {...rest}>{children}</a>
  );
}
