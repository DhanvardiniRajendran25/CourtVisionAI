export default function ConfidenceBadge({ value }) {
  const pct = Math.round(value * 100);
  let cls = 'bg-green-500/20 text-green-400';
  if (value <= 0.5) cls = 'bg-red-500/20 text-red-400';
  else if (value <= 0.7) cls = 'bg-yellow-500/20 text-yellow-400';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cls}`}>
      {pct}% confidence
    </span>
  );
}
