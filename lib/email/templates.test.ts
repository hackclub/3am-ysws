import assert from "node:assert/strict";
import test from "node:test";

import {
  EmailTemplateError,
  renderEmail,
} from "./templates";

test("escapes maker and project text in HTML", () => {
  const email = renderEmail("approved", {
    makerName: '<img src=x onerror="alert(1)">',
    projectName: "A & B <project>",
    submissionUrl: "https://3am.example/dash/projects",
  });
  assert.match(email.html, /&lt;img src=x onerror=&quot;alert(1)&quot;&gt;/);
  assert.match(email.html, /A &amp; B &lt;project&gt;/);
  assert.doesNotMatch(email.html, /<img src=x/);
});

test("rejects non-http(s) links", () => {
  assert.throws(
    () => renderEmail("approved", {
      makerName: "Maker",
      projectName: "Project",
      submissionUrl: "javascript:alert(1)",
    }),
    EmailTemplateError,
  );
});

test("requires non-empty changes feedback", () => {
  assert.throws(
    () => renderEmail("changes-requested", {
      makerName: "Maker",
      projectName: "Project",
      submissionUrl: "https://3am.example/dash/projects",
      reviewerMessage: "  ",
    }),
    EmailTemplateError,
  );
});

test("requires at least one fulfilment item", () => {
  assert.throws(
    () => renderEmail("fulfilled", { makerName: "Maker", projects: [] }),
    EmailTemplateError,
  );
});

test("renders both HTML and plain text", () => {
  const email = renderEmail("rejected", {
    makerName: "Maker",
    projectName: "Project",
    rejectionReason: "Please add a README.",
    resubmitUrl: "https://3am.example/dash/projects",
  });
  assert.match(email.html, /Please add a README\./);
  assert.match(email.text, /Please add a README\./);
});
