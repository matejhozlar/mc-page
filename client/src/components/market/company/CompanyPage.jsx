import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Settings, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import CompanyBalanceChart from "./components/CompanyBalanceChart.jsx";
import CompanyGallery from "./components/CompanyGallery.jsx";
import LoadingSpinner from "../../LoadingSpinner.jsx";
import NotFound from "../../NotFound.jsx";
import "../css/CompanyPage.css";

const CompanyPage = () => {
  const { companyId } = useParams();
  const [balance, setBalance] = useState(null);
  const [company, setCompany] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [percentChange, setPercentChange] = useState(null);
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [visitor, setVisitor] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [companyRes, balanceRes, historyRes, membersRes, visitorRes] =
          await Promise.all([
            fetch(`/api/market/company/${companyId}`),
            fetch(`/api/market/company/${companyId}/balance`),
            fetch(`/api/market/company/${companyId}/balance/history`),
            fetch(`/api/market/company/${companyId}/members`),
            fetch("/api/market/me", { credentials: "include" }),
          ]);

        const [
          companyData,
          balanceData,
          historyData,
          membersData,
          visitorData,
        ] = await Promise.all([
          companyRes.json(),
          balanceRes.json(),
          historyRes.json(),
          membersRes.json(),
          visitorRes.json(),
        ]);

        setCompany(companyData);
        setBalance(balanceData.balance);
        setVisitor(visitorData);
        setMembers(membersData.members || []);

        const rawHistory = historyData.history || [];
        const now = new Date();
        const updatedHistory = [
          ...rawHistory,
          {
            balance: balanceData.balance,
            recorded_at: now.toISOString(),
          },
        ];
        setBalanceHistory(updatedHistory);

        if (updatedHistory.length >= 2) {
          const first = updatedHistory[0].balance;
          const last = updatedHistory[updatedHistory.length - 1].balance;
          if (first !== 0) {
            const change = ((last - first) / first) * 100;
            setPercentChange(change);
          }
        }
      } catch (err) {
        console.error("❌ Failed to fetch company data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [companyId]);

  if (loading) return <LoadingSpinner message="Loading company...>" />;
  if (!company) return <p className="error">Company not found.</p>;
  if (!company.name) return <NotFound />;
  if (!visitor) return <p className="error">Visitor not found.</p>;

  const isFounder =
    visitor?.companies?.some(
      (c) => c.id === company.id && c.role === "Founder"
    ) ?? false;

  return (
    <div className="company-profile-page">
      {/* Owner Dashboard */}
      {isFounder && (
        <div className="company-owner-dashboard">
          <button className="dashboard-button">
            <Settings size={16} className="dashboard-button-shift" /> Manage
          </button>
          <button className="dashboard-button">
            <Pencil size={16} className="dashboard-button-shift" /> Edit
          </button>
        </div>
      )}
      {/* Header */}
      <div className="company-banner">
        <div className="company-banner-left">
          {/* Logo */}
          <img
            src={company.logo_url || "/assets/market/default/default-logo.png"}
            alt="Company logo"
            className="company-banner-logo"
          />
          <div className="company-meta">
            <h1>{company.name}</h1>
            <p className="company-details">
              Created on: {new Date(company.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        {/* Balance */}
        <div className="company-balance">
          {balance !== null ? (
            <p className="company-balance-percentage">
              ${Number(balance).toFixed(2)}
              {percentChange !== null && (
                <span
                  className={
                    percentChange >= 0
                      ? "percent-change up"
                      : "percent-change down"
                  }
                >
                  (
                  {percentChange >= 0 ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownRight size={16} />
                  )}
                  {Math.abs(percentChange).toFixed(2)}%)
                </span>
              )}
            </p>
          ) : (
            <p>Loading net worth...</p>
          )}
        </div>
      </div>

      {/* Banner */}
      {company.banner_url && (
        <div className="company-banner-image">
          <img
            src={company.banner_url}
            alt="Company banner"
            className="company-banner-img"
          />
        </div>
      )}
      {/* Description*/}
      {company.description && (
        <div className="company-description-box">
          <h2 className="company-section-title">Description</h2>
          <ReactMarkdown>{company.description}</ReactMarkdown>
        </div>
      )}

      {/* Gallery */}
      {company.gallery_urls && company.gallery_urls.length > 0 && (
        <CompanyGallery images={company.gallery_urls} />
      )}

      <div className="company-content">
        <h2>Company Shops</h2>
        <p>This company has {company.shop_count} shop(s).</p>
      </div>
      {/* Networth History */}
      {balanceHistory.length > 0 && (
        <CompanyBalanceChart history={balanceHistory} />
      )}
      {/* Team */}
      {members.length > 0 && (
        <div className="company-team">
          <h2>Team Members</h2>
          <ul>
            {members.map((member) => (
              <li key={member.uuid} className="team-member">
                <img
                  src={`https://crafatar.com/avatars/${member.uuid}?size=40&default=MHF_Steve`}
                  alt={`${member.name}'s avatar`}
                  className="team-avatar"
                />
                <div className="team-info">
                  <strong>{member.name}</strong> – {member.role}
                  <span className="team-joined">
                    (Joined: {new Date(member.joined_at).toLocaleDateString()})
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CompanyPage;
