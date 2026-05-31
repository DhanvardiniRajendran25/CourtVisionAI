export default function Scoreboard({ teamA, teamB, gameState }) {
  if (!gameState) return null;
  const { quarter, time_remaining, score_a, score_b, possession } = gameState;
  const isTeamAPossession =
    possession?.toLowerCase().includes(teamA.toLowerCase()) ||
    possession?.toLowerCase() === 'team_a' ||
    possession?.toLowerCase() === 'a';

  return (
    <div className="bg-[#111118] border-b border-white/5 py-4 px-6 shrink-0">
      <div className="flex items-center justify-center gap-4 md:gap-8">
        <span className="text-orange-400 font-bold text-sm md:text-base uppercase tracking-wide truncate max-w-[80px] md:max-w-none">
          {teamA}
        </span>
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-3xl md:text-4xl font-mono font-bold text-orange-400 tabular-nums">
            {score_a}
          </span>
          <span className="text-slate-600 font-bold text-lg">—</span>
          <span className="text-3xl md:text-4xl font-mono font-bold text-blue-400 tabular-nums">
            {score_b}
          </span>
        </div>
        <span className="text-blue-400 font-bold text-sm md:text-base uppercase tracking-wide truncate max-w-[80px] md:max-w-none">
          {teamB}
        </span>
      </div>
      <div className="flex items-center justify-center gap-3 mt-2">
        <span className="bg-white/10 rounded-full px-3 py-0.5 text-xs text-slate-300 font-medium">
          Q{quarter}
        </span>
        <span className="font-mono text-sm text-slate-400 tabular-nums">{time_remaining}</span>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${isTeamAPossession ? 'bg-orange-500' : 'bg-blue-500'}`}
          title={`${isTeamAPossession ? teamA : teamB} ball`}
        />
        <span className="text-xs text-slate-500">
          {isTeamAPossession ? teamA : teamB} ball
        </span>
      </div>
    </div>
  );
}
