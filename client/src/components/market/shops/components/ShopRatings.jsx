import { useEffect, useMemo, useState } from "react";
import Stars from "./Stars.jsx";
import { crafatarHead } from "../../utils/crafatar.js";
import "../../css/ShopRatings.css";

export default function ShopReviews({ shopId }) {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const [page, setPage] = useState(0);
  const limit = 10;
  const canPrev = page > 0;
  const canNext = (page + 1) * limit < total;

  const fetchPage = () => {
    setLoading(true);
    fetch(
      `/api/market/shop/${shopId}/reviews?limit=${limit}&offset=${page * limit}`
    )
      .then((r) => (r.ok ? r.json() : { reviews: [], total: 0 }))
      .then((d) => {
        setReviews(Array.isArray(d.reviews) ? d.reviews : []);
        setTotal(Number(d.total || 0));
      })
      .catch(() => {
        setReviews([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, page]);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const maxLen = 5000;

  const canSubmit = useMemo(
    () => rating >= 1 && rating <= 5 && !submitting && !alreadyReviewed,
    [rating, submitting, alreadyReviewed]
  );

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/market/shop/${shopId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating, review }),
      });

      if (res.status === 409) {
        setAlreadyReviewed(true);
        setError("You have already reviewed this shop.");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to submit review.");
      }

      setSuccess("Thanks! Your review has been submitted.");
      setReview("");
      setRating(0);
      setPage(0);
      fetchPage();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="companies-section" style={{ marginTop: 16 }}>
      <h2 className="company-section-title" style={{ marginBottom: 12 }}>
        Reviews
      </h2>

      {/* Submit box */}
      <div className="companies-cards-grid">
        <div className="companies-card review-card full-span">
          <form onSubmit={submit}>
            <div className="review-form-header">
              <div className="review-stars">
                <label className="review-stars-label">Your rating</label>
                <div className="review-stars-row">
                  <Stars
                    value={rating}
                    onChange={(v) => setRating(v)}
                    size={24}
                    precision={0.5}
                  />
                  <span className="review-stars-value">
                    {rating ? `${rating} / 5` : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="review-textarea-wrap">
              <textarea
                placeholder="Share something helpful for others (optional)…"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                maxLength={maxLen}
                rows={4}
                className="review-textarea"
                disabled={submitting || alreadyReviewed}
              />
              <div className="review-meta-row">
                <span className="review-counter">
                  {review.length}/{maxLen}
                </span>
                <div className="review-actions">
                  {alreadyReviewed && (
                    <span className="review-msg error">
                      You already submitted a review.
                    </span>
                  )}
                  {error && <span className="review-msg error">{error}</span>}
                  {success && <span className="review-msg ok">{success}</span>}
                  <button
                    className="shop-page-button"
                    type="submit"
                    disabled={!canSubmit}
                  >
                    Submit review
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="companies-cards-grid" style={{ marginTop: 12 }}>
        {loading ? (
          <div className="companies-card" style={{ width: "100%" }}>
            Loading reviews…
          </div>
        ) : reviews.length === 0 ? (
          <div className="companies-card" style={{ width: "100%" }}>
            No reviews yet.
          </div>
        ) : (
          <div className="review-list">
            {reviews.map((r) => {
              const rAvatar = crafatarHead(r.user_mc_uuid, 28);
              const rName = r.user_name || "Player";
              return (
                <article key={r.id} className="review-item">
                  <div className="review-item-left">
                    {rAvatar ? (
                      <img
                        className="review-item-avatar"
                        src={`https://mc-heads.net/avatar/${r.user_mc_uuid}/28`}
                        alt={`${rName} avatar`}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="review-item-avatar-fallback"
                        aria-hidden="true"
                      >
                        {rName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="review-item-main">
                    <div className="review-item-header">
                      <div className="review-item-title">
                        <Stars value={r.rating} size={16} readOnly />
                        <strong className="review-item-name">{rName}</strong>
                      </div>
                      <time className="companies-meta">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString()
                          : ""}
                      </time>
                    </div>
                    {r.review && <p className="review-item-body">{r.review}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Pager */}
      {total > limit && (
        <div className="review-pager">
          <button
            className="shop-page-button"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </button>
          <button
            className="shop-page-button"
            disabled={!canNext}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
          <span className="companies-meta">
            Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of{" "}
            {total}
          </span>
        </div>
      )}
    </section>
  );
}
