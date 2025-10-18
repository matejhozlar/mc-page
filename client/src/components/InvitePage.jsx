import React, { useState } from "react";
import { useParams } from "react-router-dom";
import "./css/InvitePage.css";

const InvitePage = () => {
  const { token } = useParams();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const el = document.getElementById("invite-token-content");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      alert("Could not copy token. Please copy manually.");
    }
  };

  return (
    <div className="invite-shell">
      <div className="invite-bg" aria-hidden />

      <main className="invite-wrapper">
        <header className="invite-hero">
          <div className="invite-badge">You’re in!</div>
          <h1 className="invite-title">
            Welcome to <span>Createrington</span> 🎉
          </h1>
          <p className="invite-subtitle">
            We’ve <strong>sent your invite to your email address</strong>.
            Follow the steps below to get started.
          </p>
        </header>

        <section className="invite-steps-grid">
          <article className="invite-step">
            <div className="invite-step-num" aria-hidden>
              1
            </div>
            <div className="invite-step-body">
              <h3 className="invite-step-title">
                Copy your verification token
              </h3>
              <p className="invite-step-desc">
                You’ll paste this during verification on Discord.
              </p>

              <div
                className="invite-token-row"
                role="group"
                aria-label="Verification token"
              >
                <span
                  id="invite-token-content"
                  className="invite-token-text"
                  title="Click to copy"
                  onClick={handleCopy}
                >
                  {token}
                </span>
                <button
                  className={`invite-btn invite-btn-primary ${
                    copied ? "invite-btn-success" : ""
                  }`}
                  onClick={handleCopy}
                  aria-live="polite"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </article>

          <article className="invite-step">
            <div className="invite-step-num" aria-hidden>
              2
            </div>
            <div className="invite-step-body">
              <h3 className="invite-step-title">Join our Discord</h3>
              <p className="invite-step-desc">
                Click below to join and complete verification. You’ll use your
                token in the process.
              </p>

              <div className="invite-cta-row">
                <a
                  href="https://discord.com/invite/7PAptNgqk2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="discord-link"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="discord-icon-sidebar"
                  >
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                  Join our Discord
                </a>
              </div>
            </div>
          </article>
        </section>

        <section className="invite-card">
          <h2 className="invite-section-title">Quick Start Guide</h2>
          <ol className="invite-steps-list">
            <li>
              Check your inbox for an email from{" "}
              <em>admin@create-rington.com</em> with your invite link.
            </li>
            <li>
              Join our Discord via the button above (or the email) and complete
              verification.
            </li>
            <li>When prompted, paste your token to finish setup.</li>
            <li>
              Install our modpack from #download-guide and enjoy the server!
            </li>
          </ol>

          <p className="invite-help-note">
            Didn’t get the email? Check spam or contact us on Discord:{" "}
            <strong>matejhoz</strong>.
          </p>
        </section>
      </main>
    </div>
  );
};

export default InvitePage;
