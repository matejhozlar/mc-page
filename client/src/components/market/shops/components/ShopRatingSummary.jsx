import { useEffect, useState } from "react";
import Stars from "./Stars.jsx";

export default function ShopRatingSummary({ shopId }) {
  const [data, setData] = useState({ avg: 0, count: 0, loading: true });

  useEffect(() => {
    let alive = true;
    setData((d) => ({ ...d, loading: true }));
    fetch(`/api/market/shop/${shopId}/rating`)
      .then((r) => (r.ok ? r.json() : { avg: 0, count: 0 }))
      .then((d) => {
        if (alive)
          setData({
            avg: Number(d?.avg || 0),
            count: Number(d?.count || 0),
            loading: false,
          });
      })
      .catch(() => alive && setData({ avg: 0, count: 0, loading: false }));
    return () => {
      alive = false;
    };
  }, [shopId]);

  if (data.loading) {
    return <div className="shop-rating-summary">Loading rating…</div>;
  }

  return (
    <div className="shop-rating-summary">
      <Stars value={data.avg} size={18} />
      <span className="shop-rating-summary-text">({data.count})</span>
    </div>
  );
}
