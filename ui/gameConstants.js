/** First-cut local play constants. Old ui/constants.js (C=25, board 960) is left for the unfinished net client. */
export const C = 200;              // light: cells / world-second. 1000-cell board ≈ 5 s far-side delay
export const CC = C * C;
export const boardSize = 1000;

/** Feel/proper speeds (cells per observer-proper-second). Coordinate speed is always < c via feelToReal. */
export const minSpeedMul = 0.05;   // floor ~0.05c
export const startSpeedMul = 0.2;  // spawn crawl ~0.2c = 40 cells/s
export const botSpeedMul = 0.55;   // modest default, not max
export const maxSpeedMul = 2.5;    // cap 2.5c proper
export const speedRampMul = 1.2;   // hold W/S: 1.2c per wall-second
export const speedStepMul = 0.1;   // tap W/S

export const minSpeed = minSpeedMul * C;
export const startSpeed = startSpeedMul * C;
export const botSpeed = botSpeedMul * C;
export const maxSpeed = maxSpeedMul * C;
export const speedRamp = speedRampMul * C;
export const speedStep = speedStepMul * C;

/** @deprecated alias of maxSpeed; kept so leftover imports do not break */
export const properSpeedMul = maxSpeedMul;
export const properSpeed = maxSpeed;

export const botCount = 3;

export const directions = {
	north: 0,
	west: 1,
	south: 2,
	east: 3,
};

// RGBA per occupant id 1..7 (id 0 unused)
export const palette = [
	[ 0, 0, 0, 255 ],
	[ 0, 220, 255, 255 ],   // 1 human cyan
	[ 255, 60, 60, 255 ],   // 2 bot red
	[ 255, 180, 40, 255 ],  // 3 bot orange
	[ 220, 80, 255, 255 ],  // 4 bot magenta
	[ 80, 255, 120, 255 ],  // 5 spare
	[ 255, 255, 255, 255 ],
	[ 90, 90, 110, 255 ],
];

export const pillarHues = [
	[ 255, 40, 40 ],
	[ 255, 180, 40 ],
	[ 40, 220, 80 ],
	[ 40, 180, 255 ],
	[ 180, 80, 255 ],
	[ 255, 80, 180 ],
];

export const starts = [
	{ x: 80, y: 500, d: 3, human: true },   // west → east
	{ x: 920, y: 500, d: 1, human: false }, // east → west
	{ x: 500, y: 80, d: 2, human: false },  // north → south
	{ x: 500, y: 920, d: 0, human: false }, // south → north
];
