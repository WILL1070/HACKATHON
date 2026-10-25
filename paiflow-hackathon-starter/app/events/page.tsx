import { Navbar } from "@/components/marketplace/navbar";
import { Footer } from "@/components/marketplace/footer";
import { EventsBrowser } from "@/components/events/events-browser";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events & Festivals — StayFlow",
  description:
    "Festivals, cultural events, concerts, fairs, conventions and community activities near StayFlow spaces.",
};

export default function EventsPage() {
  return (
    <div className="sf-page">
      <Navbar />
      <main className="sf-main">
        <EventsBrowser />
      </main>
      <Footer />
    </div>
  );
}
