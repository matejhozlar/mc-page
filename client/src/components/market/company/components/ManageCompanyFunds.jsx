import React, { useEffect, useState, useCallback } from "react";
import "../../css/DeleteConfirmModal.css"; // ← was .jsx before
import StatusPopupModal from "../../../modals/StatusPopupModal.jsx";

const currency = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ManageCompanyFundsModal({
  companyId,
  onClose,
  onBalanceUpdated,
}) {
  const [companyBalance, setCompanyBalance] = useState(null);
  const [userBalance, setUserBalance] = useState(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const loadBalances = useCallback(async () => {
    try {
      const [companyRes, meRes] = await Promise.all([
        fetch(`/api/market/company/${companyId}/balance`),
        fetch("/api/market/me", { credentials: "include" }),
      ]);
      const companyData = await companyRes.json();
      const me = await meRes.json();
      setCompanyBalance(Number(companyData?.balance ?? 0));
      setUserBalance(Number(me?.balance ?? 0));
    } catch (error) {
      console.error("Error", error);
      setStatus({ type: "error", message: "Failed to load balances." });
    }
  }, [companyId]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const onDeposit = async () => {
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      return setStatus({ type: "error", message: "Enter a valid amount." });
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/market/company/${companyId}/funds/deposit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amt }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return setStatus({
          type: "error",
          message: data.error || "Deposit failed.",
        });
      }
      setStatus({ type: "success", message: "Deposit successful." });
      setAmount("");
      setCompanyBalance(data.company_balance);
      onBalanceUpdated?.(data.company_balance);

      // refresh user balance too
      const meRes = await fetch("/api/market/me", { credentials: "include" });
      const me = await meRes.json();
      setUserBalance(Number(me?.balance ?? 0));
    } catch (error) {
      console.log("Error: ", error);
      setStatus({ type: "error", message: "Deposit failed." });
    } finally {
      setBusy(false);
    }
  };

  const onWithdraw = async () => {
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      return setStatus({ type: "error", message: "Enter a valid amount." });
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/market/company/${companyId}/funds/withdraw`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amt }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return setStatus({
          type: "error",
          message: data.error || "Withdraw failed.",
        });
      }
      setStatus({ type: "success", message: "Withdraw successful." });
      setAmount("");
      setCompanyBalance(data.company_balance);
      onBalanceUpdated?.(data.company_balance);

      // refresh user balance too
      const meRes = await fetch("/api/market/me", { credentials: "include" });
      const me = await meRes.json();
      setUserBalance(Number(me?.balance ?? 0));
    } catch (error) {
      console.log("Error: ", error);
      setStatus({ type: "error", message: "Withdraw failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal" style={{ maxWidth: 460, width: "100%" }}>
        <h3>Manage Company Funds</h3>

        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>Company Balance:</strong>
            </div>
            <div>
              ${companyBalance == null ? "—" : currency(companyBalance)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <div>
              <strong>Your Balance:</strong>
            </div>
            <div>${userBalance == null ? "—" : currency(userBalance)}</div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="delete-modal-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={busy}
          />
        </div>

        <div className="delete-modal-actions" style={{ gap: 8 }}>
          <button
            className="delete-modal-btn delete-modal-btn-confirm"
            onClick={onDeposit}
            disabled={busy}
            title="Move money from your balance to the company"
          >
            Deposit
          </button>
          <button
            className="delete-modal-btn"
            style={{ background: "#e67e22" }}
            onClick={onWithdraw}
            disabled={busy}
            title="Move money from the company to your balance"
          >
            Withdraw
          </button>
          <button
            className="delete-modal-btn delete-modal-btn-cancel"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
        </div>
      </div>

      {status && (
        <StatusPopupModal
          type={status.type}
          message={status.message}
          onClose={() => setStatus(null)}
        />
      )}
    </div>
  );
}
