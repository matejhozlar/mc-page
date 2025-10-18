import React, { useState, useEffect, useRef } from "react";
import "./css/WaitlistNotice.css";
import LoadingSpinner from "./LoadingSpinner";

const WaitlistNotice = () => {
  const [email, setEmail] = useState("");
  const [discordName, setDiscordName] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("");
  const [serverFull, setServerFull] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const didRedirectRef = useRef(false);

  useEffect(() => {
    const fetchPlayerLimit = async () => {
      try {
        const res = await fetch("/api/playerLimit");
        const data = await res.json();
        setServerFull(Boolean(data.isFull));
      } catch (error) {
        console.error("Error fetching player limit:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerLimit();
  }, []);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    didRedirectRef.current = false;

    if (!email || !discordName) {
      setSubmissionStatus(
        "Please fill out both fields.\nIf you're having trouble, contact admin@create-rington.com"
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/wait-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, discordName }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.autoInvited && data.token) {
          const url =
            data.redirectUrl || `/invite/${encodeURIComponent(data.token)}`;
          didRedirectRef.current = true;
          window.location.assign(url);
          return;
        }

        const msg =
          data.message ||
          (serverFull
            ? "✅ Thanks! We've added you to the waitlist. We'll contact you when a spot opens up."
            : "✅ Your application has been received! Our admins have been notified and will review it shortly.");

        setSubmissionStatus(msg);
        setEmail("");
        setDiscordName("");
      } else {
        setSubmissionStatus(
          data.error ||
            "⚠️ Error submitting form. Please try again.\nIf you're having trouble, contact admin@create-rington.com"
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmissionStatus(
        "⚠️ Network error. Please try again later.\nIf you're having trouble, contact admin@create-rington.com"
      );
    } finally {
      if (!didRedirectRef.current) setSubmitting(false);
    }
  };

  const renderClosedNotice = () => (
    <>
      <h2 className="apply-heading">
        Server is currently <span style={{ color: "red" }}>Closed</span>
      </h2>
      <p>
        Hey! Thanks for your interest in joining Create-Rington. Right now,
        we're at full capacity while we test server limits with our current
        community.
      </p>
      <p>
        We’ll reopen applications as space becomes available — most players
        rotate out within a week. Feel free to join the waitlist, and we’ll
        notify you as soon as a spot opens!
      </p>
    </>
  );

  const renderOpenNotice = () => (
    <>
      <h2 className="apply-heading">
        Server is currently <span style={{ color: "#22c55e" }}>Open</span>
      </h2>
      <p>
        Great news — we’re currently accepting new members into the
        Create-Rington community!
      </p>
      <p>
        Fill out the form below, and we’ll review your submission shortly. We're
        excited to have new players join us!
      </p>
    </>
  );

  return (
    <div className="apply-to-join" aria-busy={loading || submitting}>
      {loading && <LoadingSpinner message="Checking server status..." />}
      {submitting && <LoadingSpinner message="Processing your request..." />}

      <div
        className="waitlist-notice"
        style={{ opacity: submitting ? 0.6 : 1 }}
      >
        {!loading && (serverFull ? renderClosedNotice() : renderOpenNotice())}

        <form onSubmit={handleEmailSubmit} className="waitlist-form">
          <input
            type="email"
            placeholder="Your email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="waitlist-input form-control"
            required
            disabled={submitting}
          />
          <input
            type="text"
            placeholder="Your Discord username (e.g. User#1234)"
            value={discordName}
            onChange={(e) => setDiscordName(e.target.value)}
            className="waitlist-input form-control"
            required
            disabled={submitting}
          />
          <button
            type="submit"
            className="waitlist-submit"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>

        {submissionStatus && (
          <p className="submission-status">{submissionStatus}</p>
        )}
      </div>
    </div>
  );
};

export default WaitlistNotice;
