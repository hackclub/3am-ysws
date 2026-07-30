export default function Submit() {
  return (
    <div className="full-bleed" id="submit" style={{ background: "var(--bg2)" }}>
      <div className="inner">
        <div className="cta-box">
          <div className="s-tag cta-tag">
            <svg className="icon">
              <use href="#i-rocket" />
            </svg>{" "}
            Ready?
          </div>
          <h2>Ship it before sunrise</h2>
          <p>Submit your project and grab your reward before the night&apos;s over.</p>
          <div className="btns">
            <a
              href="https://forms.hackclub.com/3am"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary cta-btn"
            >
              <svg className="icon">
                <use href="#i-arrow" />
              </svg>
              Submit your project
            </a>
            <a
              href="https://hackclub.slack.com/app_redirect?channel=3am"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              <svg className="icon">
                <use href="#i-slack" />
              </svg>
              Join #3am on Slack
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
