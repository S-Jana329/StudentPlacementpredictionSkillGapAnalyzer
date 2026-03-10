import { PredictionFactor } from "@/data/students";

interface PredictionEngineProps {
  probability: number;
  factors: PredictionFactor[];
}

function getProbabilityLabel(prob: number) {
  if (prob >= 80) return "High";
  if (prob >= 55) return "Moderate";
  if (prob >= 35) return "Low";
  return "At Risk";
}

function getProbabilityColorClass(prob: number) {
  if (prob >= 70) return "text-success";
  if (prob >= 45) return "text-warning";
  return "text-destructive";
}

function getBarColorClass(contribution: "positive" | "negative") {
  return contribution === "positive" ? "bg-success" : "bg-destructive";
}

const PredictionEngine = ({ probability, factors }: PredictionEngineProps) => {
  const sortedFactors = [...factors].sort(
    (a, b) => Math.abs(b.weight) - Math.abs(a.weight)
  );

  return (
    <div className="section-card">
      <h3 className="font-display text-base font-semibold text-foreground mb-2">
        Prediction Engine
      </h3>
      <p className="text-xs text-muted-foreground font-body mb-6">
        Placement probability constructed from weighted academic and experiential factors.
      </p>

      {/* Main probability */}
      <div className="flex items-baseline gap-3 mb-8">
        <span className={`font-display text-5xl font-bold ${getProbabilityColorClass(probability)}`}>
          {probability}%
        </span>
        <span className="text-sm text-muted-foreground font-body">
          Probability · <span className="font-medium text-foreground">{getProbabilityLabel(probability)}</span>
        </span>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-4">
        <p className="data-label">Factor Contribution Breakdown</p>
        {sortedFactors.map((factor) => {
          const absWeight = Math.abs(factor.weight);
          return (
            <div key={factor.label} className="flex items-center gap-4">
              <span className="text-sm font-body text-foreground w-28 shrink-0">
                {factor.label}
              </span>
              <div className="flex-1 relative">
                <div className="w-full h-3 bg-muted rounded-sm">
                  <div
                    className={`factor-bar ${getBarColorClass(factor.contribution)}`}
                    style={{ width: `${absWeight}%`, opacity: 0.35 + (absWeight / 100) * 0.65 }}
                  />
                </div>
              </div>
              <span className={`text-xs font-body font-medium w-10 text-right ${
                factor.contribution === "positive" ? "text-success" : "text-destructive"
              }`}>
                {factor.weight > 0 ? "+" : ""}{factor.weight}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-success" />
          <span className="text-xs text-muted-foreground font-body">Positive contribution</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-destructive" />
          <span className="text-xs text-muted-foreground font-body">Negative contribution</span>
        </div>
      </div>
    </div>
  );
};

export default PredictionEngine;
