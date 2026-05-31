import LoadingSpinner from '../LoadingSpinner.jsx';

const INPUT_CLS =
  'w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 outline-none text-slate-100 placeholder:text-slate-600 transition-colors';

const SCENARIOS = [
  { id: 'clutch_time', icon: '🔥', label: 'Clutch Time', desc: '5 min left, close game' },
  { id: 'full_game', icon: '🏀', label: 'Full Game', desc: 'Tip-off to buzzer' },
  { id: 'comeback', icon: '💪', label: 'Comeback', desc: 'Down 15, fight back' },
];

export default function SetupScreen({
  teamA,
  setTeamA,
  teamB,
  setTeamB,
  scenario,
  setScenario,
  scoutSessionId,
  setScoutSessionId,
  injuredPlayers,
  setInjuredPlayers,
  playStyle,
  setPlayStyle,
  onStart,
  loading,
}) {
  return (
    <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 scrollbar-thin">
      <div className="w-full max-w-lg bg-[#111118] rounded-2xl p-8 border border-white/5">
        <h2 className="text-2xl font-bold text-center mb-1">🎮 Game Simulator</h2>
        <p className="text-sm text-slate-500 text-center mb-7">AI-powered game simulation with real player stats</p>

        {/* Teams */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end mb-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">Team A (Your Team)</p>
            <input
              className={INPUT_CLS}
              placeholder="Auburn"
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
            />
          </div>
          <span className="text-slate-600 font-bold text-center pb-2 px-1">VS</span>
          <div>
            <p className="text-xs text-slate-500 mb-1">Team B (Opponent)</p>
            <input
              className={INPUT_CLS}
              placeholder="Duke"
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
            />
          </div>
        </div>

        {/* Scenario */}
        <div className="mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Scenario</p>
          <div className="grid grid-cols-3 gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className={`rounded-xl p-4 cursor-pointer transition-all border text-left ${
                  scenario === s.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-white/10 bg-[#0a0a0f] hover:border-white/20'
                }`}
              >
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-sm font-medium text-slate-200">{s.label}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-tight">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Coach context */}
        <div className="mb-6 space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Coach Context (Optional)</p>
          <div>
            <p className="text-xs text-slate-600 mb-1">Injured Players</p>
            <input
              className={INPUT_CLS}
              placeholder="e.g. Johni Broome, Alex Smith"
              value={injuredPlayers}
              onChange={(e) => setInjuredPlayers(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Play Style</p>
            <input
              className={INPUT_CLS}
              placeholder="e.g. uptempo, half-court, defensive"
              value={playStyle}
              onChange={(e) => setPlayStyle(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Load Scout Intel (Session ID)</p>
            <input
              className={`${INPUT_CLS} font-mono text-xs`}
              placeholder="scout_xxx — paste from Scout tab to inject intel"
              value={scoutSessionId}
              onChange={(e) => setScoutSessionId(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={loading || !teamA.trim() || !teamB.trim()}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-4 text-lg font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)]"
        >
          {loading ? (
            <>
              <LoadingSpinner className="w-5 h-5" /> Starting...
            </>
          ) : (
            '▶ Start Simulation'
          )}
        </button>
      </div>
    </div>
  );
}
