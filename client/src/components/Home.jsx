import React, { useState, useEffect } from "react";

const Home = () => {
  const [playerCount, setPlayerCount] = useState(0);
  const [serverOnline, setServerOnline] = useState(false);
  const [email, setEmail] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("");

  const maxPlayers = 20;

  const fetchPlayerCount = async () => {
    try {
      const response = await fetch("/api/playerCount");
      if (!response.ok) {
        throw new Error("Failed to fetch player count");
      }
      const data = await response.json();
      setPlayerCount(data.count);
      setServerOnline(true);
    } catch (error) {
      console.error("Error fetching player count:", error);
      setServerOnline(false);
    }
  };

  useEffect(() => {
    fetchPlayerCount();
    const intervalId = setInterval(fetchPlayerCount, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // eslint-disable-next-line no-unused-vars
  const serverFull = serverOnline && playerCount >= maxPlayers;

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setSubmissionStatus("Please enter an email.");
      return;
    }
    try {
      const response = await fetch("/api/wait-list", {
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
    <div className="home-container">
      <h1>Server Dashboard</h1>

      {/* Server status */}
      <div className={`status ${serverOnline ? "online" : "offline"}`}>
        {serverOnline ? "Server Status: ONLINE" : "Server Status: OFFLINE"}
      </div>

      {serverOnline && (
        <>
          <p>
            Current Players: <strong>{playerCount}</strong> / {maxPlayers}
          </p>

          <div className="full-message">
            <h2>
              Server is currently <span style={{ color: "red" }}>Closed</span>{" "}
            </h2>
            <p>
              Hey, if you are interested in joining our community — unless you
              were invited by one of the current players, we’re not accepting
              new members as of now! We’re testing server limits with our
              current group. If everything looks good, we’ll reopen for new
              players soon. Most players rotate out within a week, so spots
              should open up!
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
        </>
      )}

      {!serverOnline && (
        <p className="offline-message">
          We cannot reach the server at this moment. Please try again later.
        </p>
      )}
    </div>
  );
};

export default Home;
