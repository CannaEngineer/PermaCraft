"use client";

interface CompassRoseProps {
  bearing?: number; // Map rotation in degrees (0 = north)
}

export function CompassRose({ bearing = 0 }: CompassRoseProps) {
  return (
    <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
      <svg
        width="60"
        height="60"
        viewBox="0 0 60 60"
        className="drop-shadow-lg transition-transform duration-100"
        style={{ transform: `rotate(${-bearing}deg)` }}
        role="img"
        aria-label="Compass rose showing cardinal directions"
      >
        <title>Compass Rose</title>
        {/* Background circle */}
        <circle
          cx="30"
          cy="30"
          r="28"
          fill="white"
          fillOpacity="0.9"
          stroke="black"
          strokeWidth="1"
        />

        {/* North arrow */}
        <polygon
          points="30,8 26,20 34,20"
          className="fill-red-600"
        />

        {/* Cardinal directions */}
        <text
          x="30"
          y="18"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="black"
        >
          N
        </text>
        <text
          x="30"
          y="52"
          textAnchor="middle"
          fontSize="11"
          fill="black"
        >
          S
        </text>
        <text
          x="10"
          y="35"
          textAnchor="middle"
          fontSize="11"
          fill="black"
        >
          W
        </text>
        <text
          x="50"
          y="35"
          textAnchor="middle"
          fontSize="11"
          fill="black"
        >
          E
        </text>

        {/* Cross lines */}
        <line x1="30" y1="5" x2="30" y2="55" stroke="black" strokeWidth="0.5" opacity="0.3"/>
        <line x1="5" y1="30" x2="55" y2="30" stroke="black" strokeWidth="0.5" opacity="0.3"/>
      </svg>
    </div>
  );
}
