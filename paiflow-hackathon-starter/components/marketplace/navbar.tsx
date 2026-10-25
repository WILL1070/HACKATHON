"use client";
import { useEffect, useState } from "react";
import { connectWallet, restoreWallet } from "@/lib/wallet";

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function Navbar() {
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Re-attach to an already-authorized Freighter after reloads/navigation,
  // without prompting. The user can still connect manually.
  useEffect(() => {
    let cancelled = false;
    restoreWallet().then((restored) => {
      if (!cancelled && restored) setAddress(restored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConnect() {
    setBusy(true);
    setMessage("");
    try {
      setAddress(await connectWallet());
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not connect wallet.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <nav className="sf-nav">
      <div className="sf-nav-inner">
        <a className="sf-brand" href="/" aria-label="StayFlow home">
          <span className="sf-brand-mark" aria-hidden="true">
            ◈
          </span>
          StayFlow
        </a>
        <div className="sf-nav-links">
          <a href="/#explore">Explore</a>
          <a href="/#categories">Categories</a>
          <a href="/events">Events</a>
          <a href="/#become-host">Become a Host</a>
          <a href="/bookings">My Bookings</a>
        </div>
        <div className="sf-nav-actions">
          {address ? (
            <span className="sf-wallet-connected" title={address}>
              ◎ {truncate(address)}
            </span>
          ) : (
            <button
              type="button"
              className="sf-btn sf-btn-primary"
              disabled={busy}
              onClick={handleConnect}
            >
              {busy ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
      {message && (
        <p className="sf-nav-message" role="status">
          {message}
        </p>
      )}
    </nav>
  );
}
