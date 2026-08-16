const LINKS = [
  { href: "https://hackclub.com", label: "Hack Club" },
  { href: "https://hackclub.slack.com/app_redirect?channel=3am", label: "#3am" },
  {
    href: "https://hackclub.com/privacy-and-terms#hack-club-standard-terms-and-conditions",
    label: "terms",
  },
  {
    href: "https://hackclub.com/privacy-and-terms#hack-club-privacy-notice",
    label: "privacy",
  },
  { href: "https://forms.hackclub.com/bounty", label: "fulfillment bounty" },
];

import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.links} aria-label="elsewhere">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
