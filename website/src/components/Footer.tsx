export default function Footer() {
  return (
    <footer className="border-t border-f1-border bg-f1-bg mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-f1-red rounded-md flex items-center justify-center font-black text-white text-xs">
              F1
            </div>
            <p className="text-sm text-f1-text-muted">
              2026 Season Predictions
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-f1-text-muted">
            <span>ML-Powered by XGBoost + GBR</span>
            <span>•</span>
            <span>Data via FastF1 API</span>
            <span>•</span>
            <span>Not affiliated with Formula 1</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
