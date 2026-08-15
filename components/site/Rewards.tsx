import Image from "next/image";

import { BEANS_PER_HOUR, REWARDS } from "@/lib/rewards";

import styles from "./Rewards.module.css";

export function Rewards() {
  return (
    <>
      <h2 className={styles.heading}>what you can earn</h2>
      <p className={styles.intro}>
        Spend your beans on real stuff.{" "}
        <span className={styles.rate}>1 hour = {BEANS_PER_HOUR} beans</span>
      </p>
      <ul className={styles.grid}>
        {REWARDS.map((reward) => (
          <li key={reward.name} className={styles.item}>
            <span className={styles.art} aria-hidden="true">
              {reward.emoji}
            </span>
            <span className={styles.name}>{reward.name}</span>
            <span className={styles.price}>
              <Image
                src="/assets/beans.png"
                alt=""
                width={18}
                height={18}
                className="pixel"
                unoptimized
              />
              {reward.cost}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
