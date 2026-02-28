import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t mt-12" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-f1-red rounded-md flex items-center justify-center font-black text-white text-xs">
                F1
              </div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                2026 Predictions
              </p>
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              ML-powered Formula 1 race predictions using XGBoost,
              GradientBoosting, and LSTM models trained on FastF1 telemetry data.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              Navigation
            </h4>
            <div className="space-y-2">
              {[
                { href: "/", label: "Home" },
                { href: "/calendar", label: "Season Calendar" },
                { href: "/standings", label: "Championships" },
                { href: "/about", label: "About the Model" },
              ].map(link => (
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

          {/* Tech Stack */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              Tech Stack
            </h4>
            <div className="flex flex-wrap gap-2">
              {["XGBoost", "GradientBoosting", "LSTM", "FastF1", "Next.js", "React", "Tailwind"].map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs rounded-full font-medium"
                  style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <span>© 2026 F1 Predictions. Not affiliated with Formula 1.</span>
          <div className="flex items-center gap-4">
            <span>Data via FastF1 API</span>
            <span>•</span>
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
