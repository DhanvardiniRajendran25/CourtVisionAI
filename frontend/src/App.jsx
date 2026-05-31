import { useState } from 'react';
import LandingPage from './components/Home/LandingPage.jsx';
import ScoutAgent from './components/Scout/ScoutAgent.jsx';
import GameTape from './components/GameTape/GameTape.jsx';
import Simulator from './components/Simulator/Simulator.jsx';
import ErrorToast from './components/ErrorToast.jsx';

const TABS = [
  { id: 'home',  label: '🏠 Home'      },
  { id: 'scout', label: '🔍 Scout'     },
  { id: 'tape',  label: '🎬 Game Tape' },
  { id: 'sim',   label: '🎮 Simulator' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [toast, setToast] = useState(null);

  const showError = (msg) => setToast(msg);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-3.5 flex items-center justify-between shrink-0">
        <button
          onClick={() => setActiveTab('home')}
          className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
        >
          🏀 CourtVision<span className="text-orange-500">AI</span>
        </button>
        <button className="text-slate-500 hover:text-slate-300 transition-colors p-1" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
          </svg>
        </button>
      </header>

      {/* Tab navigation */}
      <nav className="sticky top-0 z-10 bg-[#0a0a0f] border-b border-white/5 shrink-0">
        <div className="flex w-full overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none py-3 px-5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'home'  && <LandingPage onNavigate={setActiveTab} />}
        {activeTab === 'scout' && <ScoutAgent showError={showError} />}
        {activeTab === 'tape'  && <GameTape showError={showError} />}
        {activeTab === 'sim'   && <Simulator showError={showError} />}
      </main>

      {toast && <ErrorToast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
