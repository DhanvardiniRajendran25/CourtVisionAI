import { useState, useRef, useEffect } from 'react';
import { scoutAsk, scoutSendToSim } from '../../api.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import ConfidenceBadge from '../ConfidenceBadge.jsx';
import MarkdownRenderer from '../MarkdownRenderer.jsx';

const SUGGESTIONS = [
  'Full scouting report on Duke',
  "What's Auburn's biggest weakness?",
  'Compare UConn and Houston defense',
  "Scout report on Gonzaga's starting five",
];

const INPUT_CLS =
  'w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 outline-none text-slate-100 placeholder:text-slate-600 transition-colors';

export default function ScoutAgent({ showError }) {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:8000');
  const [sessionId, setSessionId] = useState(`scout_${Date.now()}`);
  const [team, setTeam] = useState('');
  const [injuredPlayers, setInjuredPlayers] = useState('');
  const [playStyle, setPlayStyle] = useState('');
  const [opponentTeam, setOpponentTeam] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [simStatus, setSimStatus] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { type: 'user', content: question }]);
    setLoading(true);
    try {
      const data = await scoutAsk(
        {
          question,
          session_id: sessionId,
          coach_context: {
            team: team || undefined,
            injured_players: injuredPlayers
              ? injuredPlayers.split(',').map((s) => s.trim()).filter(Boolean)
              : [],
            style: playStyle || undefined,
          },
        },
        apiUrl
      );
      setMessages((prev) => [
        ...prev,
        {
          type: 'ai',
          content: data.answer,
          confidence: data.confidence,
          sources: data.sources || [],
          searchQueries: data.search_queries || [],
          suggestedFollowups: data.suggested_followups || [],
        },
      ]);
    } catch (err) {
      showError(err.message || 'Scout request failed');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const sendToSim = async () => {
    if (!opponentTeam.trim()) {
      showError('Enter opponent team name first');
      return;
    }
    try {
      await scoutSendToSim({ session_id: sessionId, team: opponentTeam }, apiUrl);
      setSimStatus(`Intel compiled for ${opponentTeam}`);
    } catch (err) {
      showError(err.message || 'Failed to compile intel');
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Mobile toggle */}
      <button
        className="md:hidden absolute top-3 left-3 z-20 bg-[#111118] border border-white/10 rounded-lg p-2 text-slate-400 hover:text-slate-200"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[9] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          fixed md:static z-10 top-0 bottom-0 left-0
          w-72 bg-[#111118] border-r border-white/5 p-5 overflow-y-auto flex-shrink-0
          transition-transform duration-200 scrollbar-thin
        `}
      >
        <SidebarSection label="CONFIG">
          <Field label="API Base URL">
            <input className={INPUT_CLS} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
          </Field>
          <Field label="Session ID">
            <div className="flex gap-2">
              <input
                className={`${INPUT_CLS} flex-1 font-mono text-xs`}
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              />
              <button
                onClick={() => setSessionId(`scout_${Date.now()}`)}
                className="shrink-0 bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-white/20 transition-colors"
              >
                New
              </button>
            </div>
          </Field>
        </SidebarSection>

        <SidebarSection label="COACH CONTEXT">
          <Field label="Your Team">
            <input
              className={INPUT_CLS}
              placeholder="e.g. Auburn"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
          </Field>
          <Field label="Injured Players">
            <input
              className={INPUT_CLS}
              placeholder="e.g. Johni Broome, Alex Smith"
              value={injuredPlayers}
              onChange={(e) => setInjuredPlayers(e.target.value)}
            />
          </Field>
          <Field label="Play Style">
            <input
              className={INPUT_CLS}
              placeholder="e.g. uptempo"
              value={playStyle}
              onChange={(e) => setPlayStyle(e.target.value)}
            />
          </Field>
        </SidebarSection>

        <SidebarSection label="SEND TO SIMULATOR">
          <Field label="Opponent Team">
            <input
              className={INPUT_CLS}
              placeholder="e.g. Duke"
              value={opponentTeam}
              onChange={(e) => setOpponentTeam(e.target.value)}
            />
          </Field>
          <button
            onClick={sendToSim}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-lg py-2.5 font-semibold text-sm transition-all shadow-[0_0_15px_rgba(249,115,22,0.15)]"
          >
            Compile Intel → Simulator
          </button>
          {simStatus && (
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <span>✓</span> {simStatus}
            </p>
          )}
        </SidebarSection>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 && !loading && <EmptyState onSelect={ask} />}
          {messages.map((msg, i) =>
            msg.type === 'user' ? (
              <UserBubble key={i} content={msg.content} />
            ) : (
              <AiBubble key={i} {...msg} onFollowup={ask} />
            )
          )}
          {loading && <LoadingBubble />}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-white/5 bg-[#0a0a0f] p-4 shrink-0">
          <div className="flex gap-3">
            <input
              className="flex-1 bg-[#111118] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none placeholder:text-slate-600 text-slate-100 transition-colors"
              placeholder="Ask about any team..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && ask(input)}
              disabled={loading}
            />
            <button
              onClick={() => ask(input)}
              disabled={loading || !input.trim()}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-5 py-3 font-semibold text-sm transition-colors"
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarSection({ label, children }) {
  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-wider text-orange-500 font-semibold mb-3">{label}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

function EmptyState({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 pt-8 md:pt-0">
      <div className="text-6xl">🔍</div>
      <p className="text-slate-400 text-lg">Ask anything about any team</p>
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="bg-[#111118] border border-white/10 rounded-full px-4 py-2 text-sm text-slate-300 hover:border-orange-500/50 hover:text-orange-400 cursor-pointer transition-all"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ content }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <p className="text-xs text-orange-400 mb-1 text-right">Coach</p>
        <div className="bg-orange-600/20 border border-orange-500/30 rounded-xl rounded-br-sm p-4 text-sm text-slate-200 leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  );
}

function AiBubble({ content, confidence, sources, searchQueries, suggestedFollowups, onFollowup }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-[#111118] border border-white/5 rounded-xl rounded-bl-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs text-slate-500 font-medium">CourtVision AI</span>
          <ConfidenceBadge value={confidence} />
        </div>

        <MarkdownRenderer content={content} />

        {searchQueries.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {searchQueries.map((q, i) => (
              <span key={i} className="text-xs text-slate-600 bg-white/5 px-2 py-0.5 rounded">
                🔍 {q}
              </span>
            ))}
          </div>
        )}

        {sources.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-1.5">Sources ({sources.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s, i) => (
                <a
                  key={i}
                  href={s.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#0a0a0f] text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/20 hover:border-blue-500/50 transition-colors max-w-[200px] truncate"
                >
                  {s.title || `Source ${i + 1}`}
                </a>
              ))}
            </div>
          </div>
        )}

        {suggestedFollowups.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestedFollowups.map((f, i) => (
              <button
                key={i}
                onClick={() => onFollowup(f)}
                className="bg-[#0a0a0f] border border-white/10 rounded-full px-3 py-1 text-xs text-slate-300 hover:border-orange-500/50 hover:text-orange-400 transition-all"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#111118] border border-white/5 rounded-xl rounded-bl-sm px-5 py-4 flex items-center gap-2">
        <LoadingSpinner />
        <span className="text-sm text-slate-400">Scouting...</span>
      </div>
    </div>
  );
}
