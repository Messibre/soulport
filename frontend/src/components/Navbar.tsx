import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Activity, SunMoon } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAccount } from "wagmi";

export function Navbar() {
  const { chain } = useAccount();

  const toggleTheme = () => {
    const current =
      document.documentElement.getAttribute("data-theme") || "soulportdark";
    const next = current === "light" ? "soulportdark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("soulport-theme", next);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur border-b border-base-300 bg-base-100/75">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
        <Link
          to="/"
          className="font-black tracking-tight text-xl text-primary flex items-center gap-2"
        >
          <span className="size-2 rounded-full bg-accent shadow-[0_0_16px] shadow-accent" />
          SoulPort
        </Link>

        <nav className="ml-auto mr-3 hidden md:flex items-center gap-1">
          <NavLink to="/" className="btn btn-ghost btn-sm">
            Home
          </NavLink>
          <NavLink to="/dashboard" className="btn btn-ghost btn-sm">
            Dashboard
          </NavLink>
          <NavLink to="/import" className="btn btn-ghost btn-sm">
            Import
          </NavLink>
        </nav>

        <div className="hidden lg:flex items-center gap-2 rounded-xl bg-base-200 border border-base-300 px-3 py-2 text-xs">
          <Activity className="size-3.5 text-success" />
          <span className="opacity-80">{chain?.name ?? "No network"}</span>
        </div>

        <button
          className="btn btn-ghost btn-square"
          onClick={toggleTheme}
          aria-label="toggle theme"
        >
          <SunMoon className="size-4" />
        </button>

        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
        />
      </div>
    </header>
  );
}
