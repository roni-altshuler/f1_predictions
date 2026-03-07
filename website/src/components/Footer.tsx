import Link from "next/link";

const NEWS_OUTLETS = [
  { name: "Formula1.com", url: "https://www.formula1.com/en/latest" },
  { name: "Autosport", url: "https://www.autosport.com/f1/" },
  { name: "Motorsport.com", url: "https://www.motorsport.com/f1/" },
  { name: "The Race", url: "https://www.the-race.com/formula-1/" },
  { name: "RaceFans", url: "https://www.racefans.net/" },
];

const YOUTUBE_CHANNELS = [
  { name: "F1 Official", url: "https://www.youtube.com/@Formula1" },
  { name: "F1 TV", url: "https://www.youtube.com/@F1TV" },
  { name: "Sky Sports F1", url: "https://www.youtube.com/@SkySportsF1" },
];

export default function Footer() {
  return (
    <footer
      className="border-t mt-12 relative"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(225, 6, 0, 0.3), transparent)",
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-f1-red rounded-lg flex items-center justify-center font-black text-white text-xs shadow-lg shadow-f1-red/20">
                F1
              </div>
              <div>
                <p
                  className="text-sm font-bold"
                  style={{ color: "var(--text)" }}
                >
                  2026 Predictions
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  AI-Powered Forecasts
                </p>
              </div>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              ML-powered Formula 1 race predictions using XGBoost,
              GradientBoosting, and LSTM models trained on FastF1 telemetry
              data.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Navigation
            </h4>
            <div className="space-y-2.5">
              {[
                { href: "/", label: "Home" },
                { href: "/calendar", label: "Season Calendar" },
                { href: "/standings", label: "Championships" },
                { href: "/accuracy", label: "Accuracy Dashboard" },
                { href: "/about", label: "About the Model" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm transition-colors hover:text-f1-red"
                  style={{ color: "var(--text-muted)" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* F1 News */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              F1 News
            </h4>
            <div className="space-y-2.5">
              {NEWS_OUTLETS.map((outlet) => (
                <a
                  key={outlet.name}
                  href={outlet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm transition-colors hover:text-f1-red"
                  style={{ color: "var(--text-muted)" }}
                >
                  {outlet.name}
                </a>
              ))}
            </div>
          </div>

          {/* YouTube & Tech */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              YouTube Channels
            </h4>
            <div className="space-y-2.5 mb-6">
              {YOUTUBE_CHANNELS.map((ch) => (
                <a
                  key={ch.name}
                  href={ch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm transition-colors hover:text-f1-red"
                  style={{ color: "var(--text-muted)" }}
                >
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  {ch.name}
                </a>
              ))}
            </div>

            <h4
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              Tech Stack
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {[
                "XGBoost",
                "LSTM",
                "FastF1",
                "Next.js",
                "React",
                "Tailwind",
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full font-medium"
                  style={{
                    background: "var(--bg-surface)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <span>
            &copy; 2026 F1 Predictions. Not affiliated with Formula 1.
          </span>
          <div className="flex items-center gap-4">
            <span>Data via FastF1 API</span>
            <span>&middot;</span>
            <span>Weather via Open-Meteo</span>
            <span>&middot;</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-f1-red transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
