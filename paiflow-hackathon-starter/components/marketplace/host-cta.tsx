"use client";
import { useState } from "react";

const STEPS = [
  {
    emoji: "📝",
    title: "Create your listing",
    text: "Publish your hotel, house, lounge, conference room or study hub in minutes. Set your own pricing and availability.",
  },
  {
    emoji: "📅",
    title: "Accept bookings",
    text: "Manage your calendar, approve reservations and keep every slot organised from a single host dashboard.",
  },
  {
    emoji: "💰",
    title: "Earn in XLM",
    text: "Guests pay in XLM through the Paiflow integration. Your commission-split payout is tracked per booking.",
  },
];

export function HostCta() {
  const [sent, setSent] = useState(false);

  return (
    <section className="sf-section sf-host" id="become-host">
      <div className="sf-host-copy">
        <p className="sf-eyebrow">Become a Host</p>
        <h2 className="sf-section-title">
          Turn your space into steady income
        </h2>
        <p className="sf-section-sub">
          Join StayFlow and reach guests looking for exactly what you have —
          from city hotels to quiet study corners.
        </p>
        <ol className="sf-steps">
          {STEPS.map((step) => (
            <li key={step.title} className="sf-step">
              <span className="sf-step-emoji" aria-hidden="true">
                {step.emoji}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="sf-host-stats">
          <div>
            <strong>10+</strong>
            <span>demo spaces live</span>
          </div>
          <div>
            <strong>~90%</strong>
            <span>host share per booking</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>calendar control</span>
          </div>
        </div>
      </div>
      <div className="sf-host-panel">
        <h3>Start hosting today</h3>
        <p className="sf-muted">
          Host registration opens soon. Leave your email to get early access to
          the host dashboard.
        </p>
        {sent ? (
          <p className="sf-host-success" role="status">
            ✓ You&apos;re on the list! We&apos;ll reach out when host
            onboarding opens.
          </p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSent(true);
            }}
          >
            <label className="sf-field">
              <span>Full name</span>
              <input
                className="sf-input"
                type="text"
                required
                placeholder="Ada Lovelace"
              />
            </label>
            <label className="sf-field">
              <span>Email</span>
              <input
                className="sf-input"
                type="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <button type="submit" className="sf-btn sf-btn-primary sf-btn-block">
              Join the host waitlist
            </button>
            <p className="sf-fineprint">
              Demo form — nothing is stored or sent anywhere.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
