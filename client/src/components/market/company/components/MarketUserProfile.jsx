import { useMarketUser } from "../../../../hooks/market/marketUserContext.js";
import "../../css/MarketUserProfile.css";
import LoadingSpinner from "../../../LoadingSpinner.jsx";

const MarketUserProfile = () => {
  const { user, loading } = useMarketUser();

  if (loading) return <LoadingSpinner message="Loading profile..." />;
  if (!user) return <p>Unable to load user data.</p>;

  const { name, uuid, balance } = user;

  if (!uuid || !name || !balance) return <p>Invalid</p>;

  return (
    <div className="market-user-profile-header">
      <div className="market-profile-left">
        <img
          src={`https://mc-heads.net/avatar/${uuid}/64`}
          alt={`${name}'s avatar`}
          className="market-avatar"
        />
        <h2 className="market-username">{name}</h2>
      </div>

      <div className="market-profile-balance">
        ${Number(balance).toFixed(2)}
      </div>
    </div>
  );
};

export default MarketUserProfile;
