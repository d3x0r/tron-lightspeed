import { DIR_DELTA, opposite, turnDir } from "./cellEncoding.js";

function freeRun( world, x, y, dir, max ) {
	const d = DIR_DELTA[ dir ];
	let n = 0;
	let cx = x;
	let cy = y;
	for( let i = 0; i < max; i++ ) {
		cx += d.x;
		cy += d.y;
		if( world.blocked( cx, cy ) ) return n;
		n++;
	}
	return n;
}

/**
 * Look-ahead wall-avoider. Bots actually steer, leave trails, and die.
 * Thinks in world-now (collisions are real-time; delay is visual only).
 */
export function botThink( world ) {
	for( const cyc of world.cycles ) {
		if( cyc.human || !cyc.alive ) continue;
		if( cyc.pendingTurn ) continue;
		const look = 18;
		const ahead = freeRun( world, cyc.x, cyc.y, cyc.dir, look );
		const leftD = turnDir( cyc.dir, +1 );
		const rightD = turnDir( cyc.dir, -1 );
		const left = freeRun( world, cyc.x, cyc.y, leftD, look );
		const right = freeRun( world, cyc.x, cyc.y, rightD, look );
		if( ahead < 6 ) {
			if( left <= 0 && right <= 0 ) continue; // doomed
			if( left > right ) cyc.pendingTurn = +1;
			else if( right > left ) cyc.pendingTurn = -1;
			else cyc.pendingTurn = ( ( cyc.x + cyc.y ) & 1 ) ? +1 : -1;
			continue;
		}
		// wander: rare turn into the more-open side, never reverse
		if( Math.random() < 0.012 ) {
			if( left > 8 && left >= right && leftD !== opposite( cyc.dir ) ) cyc.pendingTurn = +1;
			else if( right > 8 && rightD !== opposite( cyc.dir ) ) cyc.pendingTurn = -1;
		}
	}
}
