import { Navbar } from "@/components/marketplace/navbar";
import { Footer } from "@/components/marketplace/footer";

export const dynamic = "force-dynamic";

export default function BookingsPage() {
  return (
    <div className="sf-page">
      <Navbar />
      <main className="sf-main">
        <div className="sf-simple">
          <p className="sf-simple-emoji" aria-hidden="true">
            🗝️
          </p>
          <h1>No bookings yet</h1>
          <p>
            When you book a space on StayFlow, your reservations will appear
            here. Bookings and user accounts are not wired up yet — this page
            is a placeholder in the demo.
          </p>
          <p>
            Want to try a payment in the meantime? The preserved 1 XLM payment
            demo is still available.
          </p>
          <a href="/#explore" className="sf-btn sf-btn-primary sf-btn-sm">
            Explore spaces
          </a>{" "}
          <a href="/pay" className="sf-btn sf-btn-sm sf-btn-ghost">
            Open payment demo
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
