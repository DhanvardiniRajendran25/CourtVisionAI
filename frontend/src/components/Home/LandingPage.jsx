import { useEffect, useState } from 'react';

const DEFAULT_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const FEATURES = [
  {
    id: 'tape',
    icon: '🎬',
    iconBg: 'bg-blue-500/15 border-blue-500/20',
    iconColor: 'text-blue-400',
    label: 'Game Tape Analyzer',
    description:
      'Paste a YouTube link. Gemini watches the full game and delivers a tactical breakdown — play patterns, key moments, and exploitable weaknesses.',
    tags: ['Gemini 2.5 Pro', 'Vision', 'Grounded'],
    tagStyle: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    buttonStyle:
      'bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]',
    borderHover: 'hover:border-blue-500/30',
  },
  {
    id: 'scout',
    icon: '🔍',
    iconBg: 'bg-orange-500/15 border-orange-500/20',
    iconColor: 'text-orange-400',
    label: 'AI Scout Agent',
    description:
      'Ask anything about any opponent. Get real-time scouting reports grounded in live stats, injury reports, and recent game data — with source citations.',
    tags: ['Gemini Flash', 'Search Grounded', 'Real-time'],
    tagStyle: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    buttonStyle:
      'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.25)] hover:shadow-[0_0_25px_rgba(249,115,22,0.4)]',
    borderHover: 'hover:border-orange-500/30',
    featured: true,
  },
  {
    id: 'sim',
    icon: '🎮',
    iconBg: 'bg-purple-500/15 border-purple-500/20',
    iconColor: 'text-purple-400',
    label: 'Game Simulator',
    description:
      'Pick two teams. AI simulates a full game play-by-play using real player stats. Pause anytime to call plays, adjust defense, or substitute — and watch the outcome shift.',
    tags: ['Multi-agent', 'Gemini Flash', 'Live Sim'],
    tagStyle: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    buttonStyle:
      'bg-purple-700 hover:bg-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.35)]',
    borderHover: 'hover:border-purple-500/30',
  },
];

export default function LandingPage({ onNavigate }) {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    fetch(`${DEFAULT_BASE}/health`)
      .then((r) => (r.ok ? setBackendStatus('online') : setBackendStatus('error')))
      .catch(() => setBackendStatus('offline'));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-12">
        {/* Basketball */}
        <div className="text-7xl mb-6 drop-shadow-[0_0_30px_rgba(249,115,22,0.4)] select-none">
          🏀
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
          CourtVision <span className="text-orange-500">AI</span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-xl leading-relaxed mb-6">
          Your AI coaching staff — scout, analyze, and simulate before tip-off.
        </p>

        {/* Badge row */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-slate-300">
            <span className="text-orange-400">⚡</span> Powered by Google Gemini 2.5 Flash
          </span>
          <BackendBadge status={backendStatus} />
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-6 pb-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <FeatureCard key={f.id} feature={f} onLaunch={() => onNavigate(f.id)} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center">
        <p className="text-xs text-slate-600">
          CourtVision AI · Built for hackathon · Powered by Google Gemini
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ feature, onLaunch }) {
  const { icon, iconBg, iconColor, label, description, tags, tagStyle, buttonStyle, borderHover, featured } =
    feature;

  return (
    <div
      className={`
        relative flex flex-col bg-[#111118] rounded-2xl p-6 border border-white/5
        transition-all duration-200 ${borderHover}
        ${featured ? 'ring-1 ring-orange-500/20' : ''}
      `}
    >
      {featured && (
        <span className="absolute top-4 right-4 text-xs bg-orange-500/15 text-orange-400 border border-orange-500/25 rounded-full px-2.5 py-0.5 font-medium">
          Most Used
        </span>
      )}

      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl mb-5 ${iconBg}`}
      >
        <span className={iconColor}>{icon}</span>
      </div>

      {/* Text */}
      <h3 className="text-base font-bold text-slate-100 mb-2">{label}</h3>
      <p className="text-sm text-slate-400 leading-relaxed flex-1 mb-5">{description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {tags.map((t) => (
          <span
            key={t}
            className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${tagStyle}`}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Launch button */}
      <button
        onClick={onLaunch}
        className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition-all ${buttonStyle}`}
      >
        Launch {icon}
      </button>
    </div>
  );
}

function BackendBadge({ status }) {
  const configs = {
    checking: { dot: 'bg-yellow-500 animate-pulse', label: 'checking backend' },
    online:   { dot: 'bg-green-500',                label: 'backend online'   },
    offline:  { dot: 'bg-red-500',                  label: 'backend offline'  },
    error:    { dot: 'bg-red-500',                  label: 'backend error'    },
  };
  const { dot, label } = configs[status] || configs.checking;

  return (
    <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-slate-300">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}
