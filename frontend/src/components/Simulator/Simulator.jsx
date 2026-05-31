import { useState } from 'react';
import { simStart, simAction, simContinue } from '../../api.js';
import SetupScreen from './SetupScreen.jsx';
import Scoreboard from './Scoreboard.jsx';
import CourtSVG from './CourtSVG.jsx';
import PlayByPlay from './PlayByPlay.jsx';
import CoachPanel from './CoachPanel.jsx';

export default function Simulator({ showError }) {
  const [phase, setPhase] = useState('setup');
  const [teamA, setTeamA] = useState('Auburn');
  const [teamB, setTeamB] = useState('Duke');
  const [scenario, setScenario] = useState('clutch_time');
  const [sessionId] = useState(`sim_${Date.now()}`);
  const [scoutSessionId, setScoutSessionId] = useState('');
  const [injuredPlayers, setInjuredPlayers] = useState('');
  const [playStyle, setPlayStyle] = useState('');
  const [plays, setPlays] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const data = await simStart({
        team_a: teamA,
        team_b: teamB,
        scenario,
        session_id: sessionId,
        scout_session_id: scoutSessionId || undefined,
        coach_context: {
          injured_players: injuredPlayers
            ? injuredPlayers.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          style: playStyle || undefined,
        },
      });
      setPlays(data.plays);
      setGameState(data.game_state);
      setPhase('game');
    } catch (err) {
      showError(err.message || 'Failed to start simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (loading) return;
    // Optimistically add coach decision to feed
    const coachEntry = {
      quarter: gameState?.quarter || 4,
      time: gameState?.time_remaining || '0:00',
      team: 'COACH',
      action: `Coach Decision: ${action}`,
      location: 'TOP_KEY',
      score_a: gameState?.score_a || 0,
      score_b: gameState?.score_b || 0,
      play_type: 'coach_decision',
    };
    setPlays((prev) => [...prev, coachEntry]);
    setLoading(true);
    try {
      const data = await simAction({ action, session_id: sessionId });
      setPlays((prev) => [...prev, ...data.plays]);
      setGameState(data.game_state);
    } catch (err) {
      showError(err.message || 'Action failed');
      setPlays((prev) => prev.filter((p) => p !== coachEntry));
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await simContinue({ session_id: sessionId });
      setPlays((prev) => [...prev, ...data.plays]);
      setGameState(data.game_state);
    } catch (err) {
      showError(err.message || 'Continue failed');
    } finally {
      setLoading(false);
    }
  };

  if (phase === 'setup') {
    return (
      <SetupScreen
        teamA={teamA}
        setTeamA={setTeamA}
        teamB={teamB}
        setTeamB={setTeamB}
        scenario={scenario}
        setScenario={setScenario}
        scoutSessionId={scoutSessionId}
        setScoutSessionId={setScoutSessionId}
        injuredPlayers={injuredPlayers}
        setInjuredPlayers={setInjuredPlayers}
        playStyle={playStyle}
        setPlayStyle={setPlayStyle}
        onStart={handleStart}
        loading={loading}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Scoreboard teamA={teamA} teamB={teamB} gameState={gameState} />

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row min-h-0">
        {/* Court */}
        <div className="w-full md:w-1/2 p-4 flex items-start justify-center overflow-y-auto scrollbar-thin">
          <CourtSVG plays={plays} />
        </div>

        {/* Play-by-play */}
        <div className="w-full md:w-1/2 border-t md:border-t-0 md:border-l border-white/5 flex flex-col overflow-hidden">
          <PlayByPlay plays={plays} loading={loading} teamA={teamA} teamB={teamB} />
        </div>
      </div>

      <CoachPanel onAction={handleAction} onContinue={handleContinue} loading={loading} />
    </div>
  );
}
