export function Footer() {
  return (
    <footer className="sf-footer">
      <div className="sf-footer-inner">
        <div className="sf-footer-brand">
          <a className="sf-brand" href="/">
            <span className="sf-brand-mark" aria-hidden="true">
              ◈
            </span>
            StayFlow
          </a>
          <p className="sf-muted">
            A demo booking marketplace on Stellar. Prices are sample data in
            XLM — no real bookings or payments are processed.
          </p>
        </div>
        <div className="sf-footer-col">
          <h4>Marketplace</h4>
          <a href="/#explore">Explore</a>
          <a href="/#categories">Categories</a>
          <a href="/events">Events &amp; Festivals</a>
          <a href="/bookings">My Bookings</a>
        </div>
        <div className="sf-footer-col">
          <h4>Hosts</h4>
          <a href="/#become-host">Become a Host</a>
          <a href="/#become-host">Host waitlist</a>
        </div>
        <div className="sf-footer-col">
          <h4>Payments</h4>
          <a href="/pay">Payment demo</a>
        </div>
      </div>
      <p className="sf-footer-base">
        © 2026 StayFlow (demo). Powered by the Paiflow SDK · Freighter ·
        Stellar.
      </p>
    </footer>
  );
}
