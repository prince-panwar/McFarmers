import React, { useState } from "react";
import "../Styles.css";

export default function StakeModal({ open, onClose, walletConnected }) {
  const [selectedPool, setSelectedPool] = useState("Pool 1");
  const [amount, setAmount] = useState("");
  const [loading, ] = useState(false);
  const [txSig, ] = useState("");
  const [error, ] = useState("");

  if (!open) return null;

  return (
    <div className="modal-overlay" style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(228,28,35,0.85)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div className="card" style={{
        minWidth: 340,
        maxWidth: 380,
        borderRadius: "22px",
        border: "var(--border-thick)",
        background: "linear-gradient(180deg, var(--bg-red-dark), var(--bg-red-darker))",
        boxShadow: "0 18px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05)"
      }}>
        <h2 style={{
          margin: "0 0 18px",
          fontSize: "22px",
          fontWeight: 900,
          color: "var(--gold)"
        }}>
          Stake
        </h2>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>
            <span style={{ color: "var(--muted)" }}>Select Pool</span>
            <select
              value={selectedPool}
              onChange={e => setSelectedPool(e.target.value)}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "12px",
                borderRadius: "14px",
                border: "var(--border-thin)",
                background: "rgba(255,255,255,.06)",
                color: "var(--text)",
                fontWeight: 700,
                fontSize: "16px"
              }}
            >
              <option value="Pool 1">🍔 McFlex Pool (Instant, Lower APY)</option>
              <option value="Pool 2">🍟 McLock Pool (7d lock, Higher APY)</option>
            </select>
          </label>
          <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>
            <span style={{ color: "var(--muted)" }}>Stake Amount</span>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "12px",
                borderRadius: "14px",
                border: "var(--border-thin)",
                background: "rgba(255,255,255,.06)",
                color: "var(--text)",
                fontWeight: 700,
                fontSize: "16px"
              }}
              placeholder="Enter amount"
            />
          </label>
        </div>
        {!walletConnected && (
          <div className="small" style={{
            color: "var(--red-accent)",
            marginBottom: 12,
            textAlign: "center"
          }}>
            Please connect your wallet to stake.
          </div>
        )}
        {error && (
          <div className="small" style={{
            color: "var(--red-accent)",
            marginBottom: 12,
            textAlign: "center"
          }}>
            {error}
          </div>
        )}
        {txSig && (
          <div className="small" style={{
            color: "var(--gold)",
            marginBottom: 12,
            textAlign: "center"
          }}>
            Success! Tx: <a href={`https://solscan.io/tx/${txSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)" }}>{txSig.slice(0, 8)}...</a>
          </div>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            className="btn gold"
            style={{ flex: 1, fontWeight: 900, fontSize: "16px" }}
            disabled={!walletConnected || !amount || loading}
          >
            {loading ? "Staking..." : "Confirm"}
          </button>
          <button
            className="btn ghost"
            style={{ flex: 1, fontWeight: 900, fontSize: "16px" }}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

