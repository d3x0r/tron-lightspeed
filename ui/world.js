import { C, boardSize, startSpeed, botSpeed, minSpeed, maxSpeed, starts, botCount } from "./gameConstants.js";
import {
	DIR_DELTA, FLAG_PILLAR, FLAG_WALL,
	packCell, packPillar, packWall,
	cellId, isOccupied, opposite, turnDir,
} from "./cellEncoding.js";
import { feelToReal, gammaFromFeel } from "./physics.js";

export class Cycle {
	constructor( id, x, y, dir, human ) {
		this.id = id;
		this.x = x;
		this.y = y;
		this.dir = dir;
		this.human = human;
		this.alive = true;
		this.frac = 0;
		this.properSpeed = human ? startSpeed : botSpeed;
		this.pendingTurn = 0;
		this.vx = 0;
		this.vy = 0;
		this.viewVx = 0;
		this.viewVy = 0;
		this.viewFeel = this.properSpeed;
		this.color = id;
	}
}

export class World {
	constructor() {
		this.size = boardSize;
		this.cells = new Uint16Array( boardSize * boardSize );
		this.time = new Float32Array( boardSize * boardSize );
		this.trail = [];
		this.pillars = [];
		this.cycles = [];
		this.tWorld = 0;
		this.tProper = 0;
		this.running = true;
		this.placePillars();
		this.spawn();
	}

	idx( x, y ) { return y * this.size + x; }

	inBounds( x, y ) {
		return x >= 0 && y >= 0 && x < this.size && y < this.size;
	}

	blocked( x, y ) {
		if( !this.inBounds( x, y ) ) return true;
		return isOccupied( this.cells[ this.idx( x, y ) ] );
	}

	writeTrail( x, y, id, inDir, outDir, t ) {
		const i = this.idx( x, y );
		const prev = this.cells[ i ];
		this.cells[ i ] = packCell( id, inDir, outDir, 0 );
		this.time[ i ] = t;
		if( prev === 0 ) this.trail.push( i );
	}

	placeBlock( x0, y0, w, h, kind ) {
		const x1 = Math.min( this.size, x0 + w );
		const y1 = Math.min( this.size, y0 + h );
		for( let y = Math.max( 0, y0 ); y < y1; y++ ) {
			for( let x = Math.max( 0, x0 ); x < x1; x++ ) {
				const i = this.idx( x, y );
				if( kind === "wall" ) {
					this.cells[ i ] = packWall();
					this.time[ i ] = 0;
				} else {
					this.cells[ i ] = packPillar( 7 );
					this.time[ i ] = 0;
					this.pillars.push( i );
				}
			}
		}
	}

	placePillars() {
		const blocks = [
			{ x: 160, y: 160, w: 40, h: 40 },
			{ x: 800, y: 160, w: 40, h: 40 },
			{ x: 160, y: 800, w: 40, h: 40 },
			{ x: 800, y: 800, w: 40, h: 40 },
			{ x: 330, y: 330, w: 48, h: 48 },
			{ x: 622, y: 330, w: 48, h: 48 },
			{ x: 330, y: 622, w: 48, h: 48 },
			{ x: 622, y: 622, w: 48, h: 48 },
		];
		for( const b of blocks ) this.placeBlock( b.x, b.y, b.w, b.h, "pillar" );
	}

	spawn() {
		const n = 1 + botCount;
		for( let i = 0; i < n; i++ ) {
			const s = starts[ i ];
			const id = i + 1;
			const cyc = new Cycle( id, s.x, s.y, s.d, !!s.human );
			this.cycles.push( cyc );
			this.writeTrail( cyc.x, cyc.y, id, opposite( cyc.dir ), cyc.dir, 0 );
			this.syncVelocity( cyc );
		}
	}

	syncVelocity( cyc ) {
		const v = cyc.alive ? feelToReal( cyc.properSpeed ) : 0;
		const d = DIR_DELTA[ cyc.dir ];
		cyc.vx = d.x * v;
		cyc.vy = d.y * v;
		if( cyc.alive ) {
			cyc.viewVx = cyc.vx;
			cyc.viewVy = cyc.vy;
			cyc.viewFeel = cyc.properSpeed;
		}
	}

	adjustSpeed( cyc, deltaFeel ) {
		if( !cyc.alive ) return;
		cyc.properSpeed = Math.min( maxSpeed, Math.max( minSpeed, cyc.properSpeed + deltaFeel ) );
		this.syncVelocity( cyc );
	}

	human() { return this.cycles[ 0 ]; }

	requestTurn( cyc, turn ) {
		if( !cyc.alive ) return;
		const next = turnDir( cyc.dir, turn );
		if( next === opposite( cyc.dir ) ) return;
		cyc.pendingTurn = turn;
	}

	applyTurnKeepingIn( cyc, enteredFrom ) {
		if( !cyc.pendingTurn ) return;
		const newDir = turnDir( cyc.dir, cyc.pendingTurn );
		cyc.dir = newDir;
		cyc.pendingTurn = 0;
		const i = this.idx( cyc.x, cyc.y );
		const t = this.time[ i ];
		this.cells[ i ] = packCell( cyc.id, enteredFrom, newDir, 0 );
		this.time[ i ] = t;
		this.syncVelocity( cyc );
	}

	enteredFromOf( cyc ) {
		const word = this.cells[ this.idx( cyc.x, cyc.y ) ];
		if( word && cellId( word ) === cyc.id ) {
			return ( word >> 4 ) & 15;
		}
		return opposite( cyc.dir );
	}

	kill( cyc ) {
		cyc.alive = false;
		cyc.vx = 0;
		cyc.vy = 0;
		// viewVx / viewVy / viewFeel stay at last living values so the camera does not snap
	}

	stepCycle( cyc, dProper ) {
		if( !cyc.alive ) return;
		cyc.frac += cyc.properSpeed * dProper;
		while( cyc.frac >= 1 && cyc.alive ) {
			cyc.frac -= 1;
			const inEdge = this.enteredFromOf( cyc );
			if( cyc.pendingTurn ) this.applyTurnKeepingIn( cyc, inEdge );
			const d = DIR_DELTA[ cyc.dir ];
			const nx = cyc.x + d.x;
			const ny = cyc.y + d.y;
			if( this.blocked( nx, ny ) ) {
				this.kill( cyc );
				return;
			}
			cyc.x = nx;
			cyc.y = ny;
			this.writeTrail( nx, ny, cyc.id, opposite( cyc.dir ), cyc.dir, this.tWorld );
			this.syncVelocity( cyc );
		}
	}

	step( dWall, observerFeelSpeed, botThink ) {
		if( !this.running ) return;
		const gObs = gammaFromFeel( observerFeelSpeed );
		const dWorld = dWall * gObs;
		this.tProper += dWall;
		this.tWorld += dWorld;
		if( botThink ) botThink( this );
		for( const cyc of this.cycles ) {
			const dProper = dWorld / gammaFromFeel( cyc.properSpeed );
			this.stepCycle( cyc, dProper );
		}
	}

	aliveCount() {
		let n = 0;
		for( const c of this.cycles ) if( c.alive ) n++;
		return n;
	}
}

export { C };