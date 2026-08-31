import Link from "next/link";
import { Shield } from "lucide-react";

export default function NotFound() {
  return (
    <div className="centered">
      <Shield size={40} style={{ color: "var(--terracotta)" }} />
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", margin: "10px 0 4px" }}>
        Page Not Found
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "13.5px", marginBottom: "16px" }}>
        The requested platform administration page does not exist.
      </p>
      <Link href="/" className="btn btn-primary">
        Return to Overview
      </Link>
    </div>
  );
}
