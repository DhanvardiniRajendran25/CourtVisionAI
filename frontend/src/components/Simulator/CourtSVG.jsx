// Court is 500×300. Coordinates from PRD.
const LOCATIONS = {
  LEFT_CORNER:     { x: 50,  y: 270 },
  LEFT_WING:       { x: 100, y: 80  },
  TOP_KEY:         { x: 250, y: 50  },
  RIGHT_WING:      { x: 400, y: 80  },
  RIGHT_CORNER:    { x: 450, y: 270 },
  LEFT_BLOCK:      { x: 170, y: 200 },
  RIGHT_BLOCK:     { x: 330, y: 200 },
  PAINT:           { x: 250, y: 180 },
  MID_RANGE_LEFT:  { x: 150, y: 140 },
  MID_RANGE_RIGHT: { x: 350, y: 140 },
  FREE_THROW:      { x: 250, y: 130 },
  FAST_BREAK:      { x: 380, y: 150 },
  FULL_COURT:      { x: 250, y: 150 },
};

export default function CourtSVG({ plays }) {
  const lastPlay = [...plays].reverse().find((p) => p.play_type !== 'coach_decision');
  const pos = lastPlay
    ? LOCATIONS[lastPlay.location] || LOCATIONS.TOP_KEY
    : LOCATIONS.TOP_KEY;

  return (
    <div className="w-full max-w-xl">
      <svg
        viewBox="0 0 500 300"
        className="w-full rounded-xl border border-white/5"
        style={{ background: '#1a1a2e' }}
      >
        {/* Court lines */}
        <g stroke="#334155" strokeWidth="1.5" fill="none">
          {/* Outer boundary */}
          <rect x="10" y="10" width="480" height="280" rx="2" />
          {/* Half-court line */}
          <line x1="250" y1="10" x2="250" y2="290" />
          {/* Center circle */}
          <circle cx="250" cy="150" r="30" />
          {/* Left paint */}
          <rect x="10" y="100" width="160" height="100" />
          {/* Left free throw arc */}
          <path d="M 170 100 A 50 50 0 0 1 170 200" />
          {/* Left 3-point arc (simplified) */}
          <path d="M 10 55 L 10 55 A 220 220 0 0 1 10 245" />
          {/* Right paint */}
          <rect x="330" y="100" width="160" height="100" />
          {/* Right free throw arc */}
          <path d="M 330 100 A 50 50 0 0 0 330 200" />
          {/* Right 3-point arc */}
          <path d="M 490 55 A 220 220 0 0 0 490 245" />
          {/* Baskets */}
          <circle cx="25" cy="150" r="7" />
          <circle cx="475" cy="150" r="7" />
        </g>

        {/* Ball — cx/cy use SVG coordinate units, so they map correctly to the viewBox */}
        <circle
          cx={pos.x}
          cy={pos.y}
          r="9"
          fill="#f97316"
          style={{
            transition: 'cx 0.6s ease-in-out, cy 0.6s ease-in-out',
            filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.7))',
          }}
        />
      </svg>
    </div>
  );
}
