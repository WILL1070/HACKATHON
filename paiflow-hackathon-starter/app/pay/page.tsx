import "./pay-demo.css";
import { publicConfig } from "@/lib/paiflow";
import { StarterApp } from "@/components/starter-app";

export const dynamic = "force-dynamic";

// The original Paiflow payment demo, preserved at /pay so the marketplace
// landing page could take over "/" without deleting payment functionality.
export default async function PayPage() {
  const config = publicConfig();
  return <StarterApp config={config} />;
}
