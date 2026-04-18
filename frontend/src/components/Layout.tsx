import { PropsWithChildren } from "react";

import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-base-100 text-base-content bg-[length:24px_24px] bg-grid">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(28,181,224,0.2),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(20,241,149,0.16),transparent_35%)]" />
      <div className="relative z-10">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
