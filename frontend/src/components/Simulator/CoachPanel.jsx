import LoadingSpinner from '../LoadingSpinner.jsx';

const PRESET_BUTTONS = [
  'Zone defense',
  'Full court press',
  'Call timeout',
  'Sub bench',
  'Feed the post',
  'Slow it down',
];

export default function CoachPanel({ onAction, onContinue, loading }) {
  return (
    <div className="bg-[#111118] border-t border-white/5 p-4 shrink-0">
      <p className="text-xs text-slate-600 uppercase tracking-wider mb-2">Coach Decisions</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESET_BUTTONS.map((btn) => (
          <button
            key={btn}
            onClick={() => onAction(btn)}
            disabled={loading}
            className="bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2 text-sm text-slate-300 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {btn}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={onContinue}
          disabled={loading}
          className="bg-slate-700 hover:bg-slate-600 rounded-lg px-6 py-2.5 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <LoadingSpinner /> Simulating...
            </>
          ) : (
            '▶ Continue'
          )}
        </button>
      </div>
    </div>
  );
}
