import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SignupSuccessNotice } from "../src/components/SignupSuccessNotice";
import { signupNoticeFor } from "../src/lib/signup-result";

const email = "demo.member@example.com";
function mockSignup(user: { identities?: unknown[] } | null, session: unknown = null, error: unknown = null) {
  return Promise.resolve({ data: { user, session }, error });
}
describe("signup notice with mocked auth responses only", () => {
  test("new unconfirmed signup keeps exact welcome copy and submitted address", async () => {
    const notice = signupNoticeFor(email, await mockSignup({ identities: [{}] }));
    const html = renderToStaticMarkup(<SignupSuccessNotice notice={notice} />);
    expect(notice?.kind).toBe("confirmation");
    expect(html).toContain("Welcome to Titan Labs Aus! Confirm your email address to complete signup. Your welcome email will then be sent to");
    expect(html).toContain(email);
    expect(html).toContain("on our next hourly send, with your referral code and member discounts. Check your inbox and junk folder.");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
  test("auto-confirmed signup with session does not ask for confirmation", async () => {
    const notice = signupNoticeFor(email, await mockSignup({ identities: [{}] }, { user: {} }));
    const html = renderToStaticMarkup(<SignupSuccessNotice notice={notice} />);
    expect(notice?.kind).toBe("confirmed");
    expect(html).toContain("Your account is ready and you&#x27;re signed in");
    expect(html).not.toContain("Confirm your email address to complete signup.");
    expect(html).not.toContain("has been sent");
  });
  test("errors render no notice even with user/session present", async () => {
    const notice = signupNoticeFor(email, await mockSignup({ identities: [{}] }, {}, new Error("Signup failed")));
    expect(notice).toBeNull();
    expect(renderToStaticMarkup(<SignupSuccessNotice notice={notice} />)).toBe("");
  });
  test("existing/ambiguous users never receive a new welcome promise", async () => {
    for (const user of [null, {}, { identities: [] }]) {
      const notice = signupNoticeFor(email, await mockSignup(user));
      expect(notice?.kind).toBe("unverified");
      const html = renderToStaticMarkup(<SignupSuccessNotice notice={notice} />);
      expect(html).not.toContain("Welcome to Titan Labs Aus!");
      expect(html).toContain("does not confirm that a new account was created");
    }
  });
  test("submitted address is escaped text, not HTML", () => {
    const html = renderToStaticMarkup(<SignupSuccessNotice notice={{ email: '<img src=x onerror="alert(1)">@example.com', kind: "confirmation" }} />);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});