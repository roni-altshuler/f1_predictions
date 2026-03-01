"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { SeasonData, COUNTRY_FLAGS } from "@/types";
import { fetchSeasonData } from "@/lib/data";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [racesOpen, setRacesOpen] = useState(false);
  const [standingsOpen, setStandingsOpen] = useState(false);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const racesRef = useRef<HTMLDivElement>(null);
  const standingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSeasonData().then(setSeason).catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (racesRef.current && !racesRef.current.contains(e.target as Node)) {
        setRacesOpen(false);
      }
      if (standingsRef.current && !standingsRef.current.contains(e.target as Node)) {
        setStandingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setRacesOpen(false);
    setStandingsOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkClass = (href: string) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive(href)
        ? "text-f1-red"
        : "hover:text-[var(--text)]"
    }`;

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{
        background: theme === "dark" ? "rgba(10,12,20,0.85)" : "rgba(255,255,255,0.85)",
        borderColor: "var(--glass-border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-f1-red rounded-lg flex items-center justify-center font-black text-white text-sm tracking-tighter group-hover:scale-105 transition-transform">
              F1
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-tight" style={{ color: "var(--text)" }}>
                2026 Predictions
              </p>
              <p className="text-xs leading-tight" style={{ color: "var(--text-muted)" }}>
                ML-Powered Forecasts
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <Link href="/" className={linkClass("/")}>Home</Link>

            {/* Races Dropdown */}
            <div ref={racesRef} className="relative">
              <button
                onClick={() => { setRacesOpen(!racesOpen); setStandingsOpen(false); }}
                className={`${linkClass("/race")} inline-flex items-center gap-1`}
              >
                Races
                <svg className={`w-3.5 h-3.5 transition-transform ${racesOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {racesOpen && season && (
                <div className="dropdown-menu absolute top-full left-0 mt-2 w-80 max-h-[70vh] overflow-y-auto">
                  <div className="p-2">
                    <Link
                      href="/calendar"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                      style={{ color: "var(--text)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span className="text-f1-red">📅</span>
                      Full Season Calendar
                    </Link>
                    <div className="h-px my-1" style={{ background: "var(--border)" }} />
                    {season.calendar.map((race) => {
                      const completed = season.completedRounds.includes(race.round);
                      return (
                        <Link
                          key={race.round}
                          href={completed ? `/race/${race.round}` : "/calendar"}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
                          style={{ color: completed ? "var(--text)" : "var(--text-muted)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <span className="text-base w-6 text-center">
                            {COUNTRY_FLAGS[race.country] || "🏁"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">{race.name}</span>
                          </div>
                          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                            R{race.round}
                          </span>
                          {completed && (
                            <span className="w-1.5 h-1.5 rounded-full bg-f1-green shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Standings Dropdown */}
            <div ref={standingsRef} className="relative">
              <button
                onClick={() => { setStandingsOpen(!standingsOpen); setRacesOpen(false); }}
                className={`${linkClass("/standings")} inline-flex items-center gap-1`}
              >
                Standings
                <svg className={`w-3.5 h-3.5 transition-transform ${standingsOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {standingsOpen && (
                <div className="dropdown-menu absolute top-full left-0 mt-2 w-56">
                  <div className="p-2">
                    {[
                      { href: "/standings?tab=drivers", label: "Driver Championship", icon: "🏆" },
                      { href: "/standings?tab=constructors", label: "Constructor Championship", icon: "🏭" },
                      { href: "/standings?tab=wdc", label: "Who Can Still Win?", icon: "📊" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                        style={{ color: "var(--text)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link href="/about" className={linkClass("/about")}>About</Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="ml-3 p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile: theme + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg"
              style={{ color: "var(--text-muted)" }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              className="p-2"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <div className="px-4 py-3 space-y-1">
            <Link href="/" className="block px-4 py-2.5 rounded-lg text-sm font-medium" style={{ color: isActive("/") ? "#E8002D" : "var(--text)" }}>
              Home
            </Link>
            <Link href="/calendar" className="block px-4 py-2.5 rounded-lg text-sm font-medium" style={{ color: isActive("/calendar") ? "#E8002D" : "var(--text)" }}>
              Calendar
            </Link>
            {/* Race links in mobile */}
            {season && season.completedRounds.length > 0 && (
              <div className="pl-4">
                {season.calendar.filter(r => season.completedRounds.includes(r.round)).map(race => (
                  <Link
                    key={race.round}
                    href={`/race/${race.round}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span>{COUNTRY_FLAGS[race.country] || "🏁"}</span>
                    {race.name}
                  </Link>
                ))}
              </div>
            )}
            <Link href="/standings" className="block px-4 py-2.5 rounded-lg text-sm font-medium" style={{ color: isActive("/standings") ? "#E8002D" : "var(--text)" }}>
              Standings
            </Link>
            <Link href="/about" className="block px-4 py-2.5 rounded-lg text-sm font-medium" style={{ color: isActive("/about") ? "#E8002D" : "var(--text)" }}>
              About
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
