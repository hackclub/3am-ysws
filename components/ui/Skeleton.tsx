import styles from "./Skeleton.module.css";

export function Skeleton({ width = "100%", height }: { width?: string; height?: string }) {
  return <span className={styles.bar} style={{ width, height }} aria-hidden="true" />;
}

const WIDTHS = ["60%", "85%", "40%", "72%", "55%"];

export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.lines} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} width={WIDTHS[index % WIDTHS.length]} />
      ))}
    </div>
  );
}
