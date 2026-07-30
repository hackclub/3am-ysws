export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hackclub-footer-logo.png" alt="Hack Club Logo" />
        <ul className="footer-links">
          <li>
            <a
              href="https://hackclub.com/privacy-and-terms#hack-club-standard-terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
            >
              TOS
            </a>
          </li>
          <li>
            <a
              href="https://hackclub.com/privacy-and-terms#hack-club-privacy-notice"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </li>
          <li>
            <a href="https://forms.hackclub.com/bounty" target="_blank" rel="noopener noreferrer">
              Fulfillment Bounty
            </a>
          </li>
          <li>
            <a href="https://hackclub.com" target="_blank" rel="noopener noreferrer">
              Hack Club
            </a>
          </li>
          <li>
            <a
              href="https://hackclub.slack.com/app_redirect?channel=3am"
              target="_blank"
              rel="noopener noreferrer"
            >
              Slack
            </a>
          </li>
          <li>
            <a href="https://hackatime.hackclub.com" target="_blank" rel="noopener noreferrer">
              Hackatime
            </a>
          </li>
        </ul>
        <p className="footer-copy">
          Made by{" "}
          <a
            href="https://hridhaan.me"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-author"
          >
            Hridhaan
          </a>{" "}
          with help by Seba, for{" "}
          <a
            href="https://hackclub.com"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-brand"
          >
            Hack Club
          </a>
        </p>
      </div>
    </footer>
  );
}
