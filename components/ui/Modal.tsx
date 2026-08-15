"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import styles from "./Modal.module.css";

export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{title}</h2>
        {children}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </dialog>
  );
}
