import { Navbar } from "@/components/marketplace/navbar";
import { Footer } from "@/components/marketplace/footer";
import { BookingsList } from "@/components/marketplace/bookings-list";

export const dynamic = "force-dynamic";

export default function BookingsPage() {
  return (
    <div className="sf-page">
      <Navbar />
      <main className="sf-main">
        <BookingsList />
      </main>
      <Footer />
    </div>
  );
}
