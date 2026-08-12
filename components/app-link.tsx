import type { AnchorHTMLAttributes, ReactNode } from "react";

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Sites currently ships a Vinext router build whose client-side Link handler
 * can fail before navigation. Native anchors keep navigation reliable while
 * preserving progressive enhancement, accessibility, and server rendering.
 */
export function AppLink({ href, children, ...props }: AppLinkProps) {
  return <a href={href} {...props}>{children}</a>;
}
