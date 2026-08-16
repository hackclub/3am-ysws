import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "ghost" | "quiet" | "danger";

function classesFor(variant: ButtonVariant, loading: boolean, extra?: string) {
  return [
    styles.root,
    variant !== "primary" ? styles[variant] : null,
    loading ? styles.loading : null,
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  loading = false,
  loadingLabel,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={classesFor(variant, loading, className)}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
    >
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link {...rest} href={href} className={classesFor(variant, false, className)}>
      {children}
    </Link>
  );
}
