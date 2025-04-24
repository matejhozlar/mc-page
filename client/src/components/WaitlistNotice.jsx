import React, { useState } from "react";

const WaitlistNotice = () => {
  const [email, setEmail] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("");

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setSubmissionStatus("Please enter an email.");
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/wait-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        setSubmissionStatus("Thanks! We'll contact you when spots open up.");
        setEmail("");
      } else {
        setSubmissionStatus("Error submitting email. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting email:", error);
      setSubmissionStatus("Error submitting email. Please try again.");
    }
  };

  return (
    <div className="waitlist-notice">
      <h2 className="apply-heading">
        Server is currently <span style={{ color: "red" }}>Closed</span>
      </h2>
      <p>
        Hey, if you are interested in joining our community — unless you were
        invited by one of the current players, we’re not accepting new members
        as of now! We’re testing server limits with our current group.
      </p>
      <p>
        If everything looks good, we’ll reopen for new players soon. Most
        players rotate out within a week, so spots should open up!
      </p>

      <form onSubmit={handleEmailSubmit} className="waitlist-form">
        <input
          type="email"
          placeholder="Your email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="waitlist-input"
          required
        />
        <button type="submit" className="waitlist-submit">
          Submit
        </button>
      </form>

      {submissionStatus && (
        <p className="submission-status">{submissionStatus}</p>
      )}
    </div>
  );
};

export default WaitlistNotice;
