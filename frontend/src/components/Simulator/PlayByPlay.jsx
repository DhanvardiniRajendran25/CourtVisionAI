import { useEffect, useRef } from 'react';
import LoadingSpinner from '../LoadingSpinner.jsx';

const PLAY_ICONS = {
  made_shot: '🏀',
  missed_shot: '❌',
  turnover: '🔄',
  foul: '🚨',
  free_throw: '🎯',
  steal: '💨',
  block: '🛡️',
  rebound: '↩️',
};

export default function PlayByPlay({ plays, loading, teamA, teamB }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [plays, loading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
      <p className="text-xs uppercase tracking-wider text-slate-600 font-medium mb-3 px-1">
        Play-by-Play
      </p>
      <div className="space-y-0.5">
        {plays.map((play, i) => {
          if (play.play_type === 'coach_decision') {
            return (
              <div
                key={i}
                className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 my-2"
              >
                <p className="text-orange-400 font-semibold text-sm">
                  📋 COACH: {play.action.replace('Coach Decision: ', '')}
                </p>
              </div>
            );
          }

          const isTeamA =
            play.team?.toLowerCase() === teamA.toLowerCase() ||
            play.team?.toLowerCase() === 'team_a' ||
            play.team?.toLowerCase() === 'a';
          const icon = PLAY_ICONS[play.play_type] || '•';

          return (
            <div
              key={i}
              className="flex items-start gap-2.5 py-2 border-b border-white/[0.04] last:border-0"
            >
              <span className="text-xs font-mono text-slate-600 w-10 shrink-0 mt-0.5 tabular-nums">
                {play.time}
              </span>
              <span
                className={`rounded-full w-2 h-2 mt-1.5 shrink-0 ${
                  isTeamA ? 'bg-orange-500' : 'bg-blue-500'
                }`}
              />
              <span className="text-sm text-slate-300 flex-1 leading-snug">
                {icon} {play.action}
              </span>
              <span className="text-xs font-mono text-slate-500 shrink-0 tabular-nums">
                {play.score_a}–{play.score_b}
              </span>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 py-3">
            <LoadingSpinner />
            <span className="text-sm text-slate-400">Simulating...</span>
          </div>
        )}

        {plays.length === 0 && !loading && (
          <p className="text-sm text-slate-600 text-center py-8">Game starting...</p>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
