import { useState, useRef, useEffect } from 'react';
import { analyzeVideoUpload } from '../../api.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import ConfidenceBadge from '../ConfidenceBadge.jsx';
import MarkdownRenderer from '../MarkdownRenderer.jsx';

const INPUT_CLS =
  'bg-[#111118] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none placeholder:text-slate-600 text-slate-100 transition-colors';

const ACCEPTED = 'video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi';

export default function GameTape({ showError }) {
  const [file, setFile] = useState(null);
  const [localUrl, setLocalUrl] = useState(null);
  const [coachMessage, setCoachMessage] = useState('');   // upfront message
  const [initTimestamp, setInitTimestamp] = useState(''); // upfront timestamp
  const [analysis, setAnalysis] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followupInput, setFollowupInput] = useState('');
  const [followupTimestamp, setFollowupTimestamp] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, analysis]);

  useEffect(() => {
    return () => { if (localUrl) URL.revokeObjectURL(localUrl); };
  }, [localUrl]);

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setLocalUrl(URL.createObjectURL(f));
    setAnalysis(null);
    setMessages([]);
  };

  const buildHistory = (currentMessages) =>
    currentMessages.map((m) => ({
      role: m.role === 'user' ? 'coach' : 'assistant',
      content: m.content,
    }));

  const analyze = async () => {
    if (!file || loading) return;
    setLoading(true);
    setAnalysis(null);
    setMessages([]);
    try {
      const data = await analyzeVideoUpload({
        file,
        // Use coach's message if provided, else default full breakdown
        message: coachMessage.trim() ||
          'Give me a full tactical breakdown — key plays, patterns, and weaknesses to exploit.',
        timestamp: initTimestamp.trim() || undefined,
      });
      setAnalysis(data);
    } catch (err) {
      showError(err.message || 'Video analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const askFollowup = async (question, ts = followupTimestamp) => {
    if (!question.trim() || followupLoading || !file) return;
    setFollowupInput('');
    setFollowupTimestamp('');

    const userMsg = { role: 'user', content: question, ts: ts || null };
    setMessages((prev) => [...prev, userMsg]);
    setFollowupLoading(true);
    try {
      const data = await analyzeVideoUpload({
        file,
        message: question,
        timestamp: ts || undefined,
        history: buildHistory([...messages, userMsg]),
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, confidence: data.confidence },
      ]);
    } catch (err) {
      showError(err.message || 'Follow-up failed');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setFollowupLoading(false);
    }
  };

  const askAboutTimestamp = (moment) => {
    askFollowup(`What happened at ${moment.timestamp}? ${moment.title}`, moment.timestamp);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith('video/')) pickFile(f);
    else showError('Please drop a video file');
  };

  const fmtSize = (bytes) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="flex flex-1 overflow-hidden flex-col md:flex-row">

      {/* ── Left: upload + coach prompt + key moments ── */}
      <div className="w-full md:w-1/2 p-6 border-b border-white/5 md:border-b-0 md:border-r overflow-y-auto scrollbar-thin flex flex-col gap-4">

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer ${
            dragOver
              ? 'border-orange-500 bg-orange-500/5'
              : file
              ? 'border-white/10 bg-[#111118] cursor-default'
              : 'border-white/10 hover:border-orange-500/40 hover:bg-orange-500/5 bg-[#111118]'
          }`}
        >
          {!file ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center select-none">
              <div className="text-4xl mb-3">🎬</div>
              <p className="text-slate-300 font-medium text-sm mb-1">Drop your game tape here</p>
              <p className="text-slate-600 text-xs mb-4">or click to browse</p>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-white/20 transition-colors"
              >
                Browse files
              </button>
              <p className="text-slate-700 text-xs mt-3">MP4 · MOV · WEBM · AVI</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 text-lg">
                🎬
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{fmtSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 shrink-0"
              >
                Change
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        {/* ── Coach Prompt (visible once file is selected) ── */}
        {file && (
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs text-orange-500 font-semibold uppercase tracking-wider">
              Coach Message
            </p>

            {/* Message input */}
            <textarea
              className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none placeholder:text-slate-600 text-slate-100 transition-colors resize-none"
              rows={3}
              placeholder="What do you want to know? e.g. 'How are they defending the pick and roll?' Leave blank for a full breakdown."
              value={coachMessage}
              onChange={(e) => setCoachMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.metaKey && analyze()}
            />

            {/* Timestamp row */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">Focus timestamp</span>
              <input
                className="w-28 bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono focus:border-orange-500 outline-none placeholder:text-slate-700 text-slate-300 transition-colors"
                placeholder="e.g. 02:30"
                value={initTimestamp}
                onChange={(e) => setInitTimestamp(e.target.value)}
              />
              {initTimestamp && (
                <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-0.5 flex items-center gap-1">
                  @ {initTimestamp}
                  <button onClick={() => setInitTimestamp('')} className="text-orange-500/60 hover:text-orange-400 ml-1">✕</button>
                </span>
              )}
            </div>

            {/* Analyze button */}
            <button
              onClick={analyze}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:opacity-40 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(249,115,22,0.15)]"
            >
              {loading ? <><LoadingSpinner /> Analyzing...</> : '▶ Analyze Tape'}
            </button>
          </div>
        )}

        {/* Local video preview */}
        {localUrl && (
          <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/5">
            <video
              src={localUrl}
              controls
              className="w-full h-full object-contain"
              preload="metadata"
            />
          </div>
        )}

        {/* Key moments — clickable timestamp chips */}
        {analysis?.key_moments?.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2.5">
              Key Moments — tap to ask
            </p>
            <div className="flex flex-col gap-2">
              {analysis.key_moments.map((m, i) => (
                <button
                  key={i}
                  onClick={() => askAboutTimestamp(m)}
                  className="flex items-start gap-3 bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-left hover:border-orange-500/40 hover:bg-orange-500/5 transition-all group"
                >
                  <span className="font-mono text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2 py-1 shrink-0 group-hover:bg-orange-500/20 transition-colors">
                    {m.timestamp}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200">{m.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{m.insight}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: analysis + follow-up chat ── */}
      <div className="w-full md:w-1/2 flex flex-col overflow-hidden">
        {!analysis && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-slate-500 text-sm">
                {file ? 'Enter your message and click Analyze' : 'Upload a game tape to begin'}
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center gap-3">
            <LoadingSpinner className="w-5 h-5" />
            <div className="text-center">
              <p className="text-slate-300 text-sm font-medium">Analyzing footage...</p>
              <p className="text-slate-600 text-xs mt-1">This may take 30–60 seconds</p>
            </div>
          </div>
        )}

        {analysis && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
              {/* Analysis card */}
              <div className="bg-[#111118] rounded-xl p-5 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-orange-500 font-semibold text-sm">📊 Tactical Breakdown</span>
                  <ConfidenceBadge value={analysis.confidence} />
                </div>

                {/* Show what the coach asked */}
                {coachMessage.trim() && (
                  <p className="text-xs text-slate-500 mb-3 italic">
                    "{coachMessage.trim()}"
                    {initTimestamp && (
                      <span className="ml-2 font-mono text-orange-400 not-italic bg-orange-500/10 border border-orange-500/20 rounded px-1.5 py-0.5">
                        @ {initTimestamp}
                      </span>
                    )}
                  </p>
                )}

                <p className="text-slate-200 text-sm leading-relaxed">{analysis.answer}</p>

                {analysis.summary && (
                  <div className="border-t border-white/5 pt-3 mt-3">
                    <MarkdownRenderer content={analysis.summary} />
                  </div>
                )}

                {analysis.weaknesses?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Weaknesses to Exploit</p>
                    <ul className="space-y-1">
                      {analysis.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-red-400 shrink-0 mt-0.5">•</span>{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.patterns?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Play Patterns</p>
                    <div className="space-y-1.5">
                      {analysis.patterns.map((p, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm text-slate-300">{p.name}</span>
                          <span className="text-xs text-slate-500">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.follow_up_suggestions?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {analysis.follow_up_suggestions.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => askFollowup(f)}
                        className="bg-[#0a0a0f] border border-white/10 rounded-full px-3 py-1 text-xs text-slate-300 hover:border-orange-500/50 hover:text-orange-400 transition-all"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Follow-up conversation */}
              {messages.map((msg, i) =>
                msg.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%]">
                      {msg.ts && (
                        <p className="text-right mb-1">
                          <span className="font-mono text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-0.5">
                            @ {msg.ts}
                          </span>
                        </p>
                      )}
                      <div className="bg-orange-600/20 border border-orange-500/30 rounded-xl rounded-br-sm p-4 text-sm text-slate-200 leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="bg-[#111118] border border-white/5 rounded-xl p-4">
                    <div className="flex justify-end mb-2">
                      {msg.confidence != null && <ConfidenceBadge value={msg.confidence} />}
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{msg.content}</p>
                  </div>
                )
              )}

              {followupLoading && (
                <div className="bg-[#111118] border border-white/5 rounded-xl p-4 flex items-center gap-2">
                  <LoadingSpinner />
                  <span className="text-sm text-slate-400">Analyzing...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Follow-up input bar */}
            <div className="border-t border-white/5 bg-[#0a0a0f] p-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-500 shrink-0">Focus timestamp</span>
                <input
                  className="w-28 bg-[#111118] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono focus:border-orange-500 outline-none placeholder:text-slate-700 text-slate-300 transition-colors"
                  placeholder="e.g. 02:30"
                  value={followupTimestamp}
                  onChange={(e) => setFollowupTimestamp(e.target.value)}
                />
                {followupTimestamp && (
                  <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-0.5 flex items-center gap-1">
                    @ {followupTimestamp}
                    <button onClick={() => setFollowupTimestamp('')} className="text-orange-500/60 hover:text-orange-400 ml-1">✕</button>
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <input
                  className={`flex-1 ${INPUT_CLS}`}
                  placeholder="Ask a follow-up question..."
                  value={followupInput}
                  onChange={(e) => setFollowupInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && askFollowup(followupInput)}
                  disabled={followupLoading}
                />
                <button
                  onClick={() => askFollowup(followupInput)}
                  disabled={followupLoading || !followupInput.trim()}
                  className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-5 py-3 font-semibold text-sm transition-colors"
                >
                  Ask
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
