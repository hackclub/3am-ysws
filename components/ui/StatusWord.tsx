import type { ReactNode } from "react";

import { ORDER_STATUS, PROJECT_STATUS } from "@/lib/status";
import type { OrderStatus, ProjectStatus, Tone } from "@/lib/status";

import styles from "./StatusWord.module.css";

export type StatusSize = "s" | "m" | "l";

export function StatusWord({
  tone,
  size = "m",
  children,
}: {
  tone: Tone;
  size?: StatusSize;
  children: ReactNode;
}) {
  return <span className={[styles.word, styles[tone], styles[size]].join(" ")}>{children}</span>;
}

export function ProjectStatusWord({
  status,
  size = "m",
}: {
  status: ProjectStatus;
  size?: StatusSize;
}) {
  const { word, tone } = PROJECT_STATUS[status];
  return (
    <StatusWord tone={tone} size={size}>
      {word}
    </StatusWord>
  );
}

export function OrderStatusWord({
  status,
  size = "m",
}: {
  status: OrderStatus;
  size?: StatusSize;
}) {
  const { word, tone } = ORDER_STATUS[status];
  return (
    <StatusWord tone={tone} size={size}>
      {word}
    </StatusWord>
  );
}
