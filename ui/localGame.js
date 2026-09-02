/**
 * First-cut local play: top-down 1000x1000 canvas, 1 human + 3 bots,
 * grid trails with in/out+time, light delay + observer-relative aberration.
 * Does not require login / websocket. Unfinished net client remains in board.js.
 */
import { C, boardSize, palette, pillarHues, minSpeed, maxSpeed, speedRamp, speedStep } from "./gameConstants.js";
import { cellId, isPillar, isWall } from "./cellEncoding.js";
import { feelToReal, gammaFromFeel, lightDelay, apparentPos } from "./physics.js?v=20260902a";
import { World } from "./world.js";
import { botThink } from "./bots.js";

const canvas = document.getElementById( "gameCanvas" );
const hud = document.getElementById( "hud" );
const ctx = canvas.getContext( "2d", { alpha: false } );

canvas.width = boardSize;
canvas.height = boardSize;

const image = ctx.createImageData( boardSize, boardSize );
const px = image.data;

let world = new World();
let godView = false;
let lastWall = 0;
let running = true;
const keys = new Set();

function reset() {
	world = new World();
	running = true;
	lastWall = 0;
}

/**
 * Camera / aberration uses last living velocity. On death the cycle stops
 * (vx=vy=0) but viewVx/viewVy/viewFeel keep the last β so the screen does not snap.
 */
function observerState() {
	const h = world.human();
	if( godView ) {
		return {
			x: h.x + 0.5,
			y: h.y + 0.5,
			vx: 0,
			vy: 0,
			feel: 0,
			selfId: h.id,
		};
	}
	return {
		x: h.x + 0.5,
		y: h.y + 0.5,
		vx: h.viewVx,
		vy: h.viewVy,
		feel: h.viewFeel,
		selfId: h.id,
	};
}

function clearBlack() {
	px.fill( 0 );
	for( let i = 3; i < px.length; i += 4 ) px[ i ] = 255;
}

function plot( x, y, r, g, b, a = 255 ) {
	const ix = x | 0;
	const iy = y | 0;
	if( ix < 0 || iy < 0 || ix >= boardSize || iy >= boardSize ) return;
	const o = ( iy * boardSize + ix ) << 2;
	px[ o ] = r;
	px[ o + 1 ] = g;
	px[ o + 2 ] = b;
	px[ o + 3 ] = a;
}

function plotHead( x, y, r, g, b ) {
	for( let dy = -2; dy <= 2; dy++ )
		for( let dx = -2; dx <= 2; dx++ )
			plot( x + dx, y + dy, r, g, b );
}

function drawCellAt( sx, sy, ox, oy, vx, vy, r, g, b, aberrate ) {
	if( aberrate ) {
		const p = apparentPos( sx, sy, ox, oy, vx, vy );
		plot( p.x, p.y, r, g, b );
	} else {
		plot( sx, sy, r, g, b );
	}
}

function render() {
	const obs = observerState();
	const tObs = world.tWorld;
	const aberrate = !godView && ( obs.vx !== 0 || obs.vy !== 0 );
	clearBlack();

	for( let i = 0; i < boardSize; i++ ) {
		plot( i, 0, 40, 40, 55 );
		plot( i, boardSize - 1, 40, 40, 55 );
		plot( 0, i, 40, 40, 55 );
		plot( boardSize - 1, i, 40, 40, 55 );
	}

	for( const i of world.pillars ) {
		const sx = i % boardSize;
		const sy = ( i / boardSize ) | 0;
		const delay = godView ? 0 : lightDelay( sx + 0.5, sy + 0.5, obs.x, obs.y );
		const seen = tObs - delay;
		if( seen < 0 && !godView ) continue;
		const hue = pillarHues[ ( ( seen | 0 ) % pillarHues.length + pillarHues.length ) % pillarHues.length ];
		drawCellAt( sx, sy, obs.x, obs.y, obs.vx, obs.vy, hue[ 0 ], hue[ 1 ], hue[ 2 ], aberrate );
	}

	for( const i of world.trail ) {
		const word = world.cells[ i ];
		if( !word || isPillar( word ) || isWall( word ) ) continue;
		const id = cellId( word );
		const sx = i % boardSize;
		const sy = ( i / boardSize ) | 0;
		const tWrite = world.time[ i ];
		const own = id === obs.selfId;
		if( !godView && !own ) {
			if( tWrite + lightDelay( sx + 0.5, sy + 0.5, obs.x, obs.y ) > tObs ) continue;
		}
		const col = palette[ id ] || palette[ 6 ];
		drawCellAt( sx, sy, obs.x, obs.y, obs.vx, obs.vy, col[ 0 ], col[ 1 ], col[ 2 ], aberrate && !own );
	}

	for( const cyc of world.cycles ) {
		const col = palette[ cyc.id ];
		const own = cyc.id === obs.selfId;
		if( !godView && !own ) {
			if( world.time[ world.idx( cyc.x, cyc.y ) ] + lightDelay( cyc.x + 0.5, cyc.y + 0.5, obs.x, obs.y ) > tObs )
				continue;
		}
		let hx = cyc.x;
		let hy = cyc.y;
		if( aberrate && !own ) {
			const p = apparentPos( hx + 0.5, hy + 0.5, obs.x, obs.y, obs.vx, obs.vy );
			hx = p.x;
			hy = p.y;
		}
		const br = cyc.alive ? 1 : 0.45;
		plotHead( hx, hy, col[ 0 ] * br, col[ 1 ] * br, col[ 2 ] * br );
	}

	ctx.putImageData( image, 0, 0 );

	const h = world.human();
	const g = gammaFromFeel( obs.feel );
	const vReal = feelToReal( obs.feel );
	const status = h.alive ? "RIDING" : "CRASHED (view frozen)";
	const others = world.cycles.filter( c => !c.human && c.alive ).length;
	hud.innerHTML =
		"<b>TRON Lightspeed</b>  " + status + "  bots alive " + others + "/3<br>" +
		"world t=" + world.tWorld.toFixed( 2 ) + "s  proper t=" + world.tProper.toFixed( 2 ) + "s  gamma=" + g.toFixed( 2 ) + "  " +
		"SPEED  v_feel=" + ( obs.feel / C ).toFixed( 2 ) + "c  v_real=" + ( vReal / C ).toFixed( 2 ) + "c  " +
		"(" + minSpeed / C + "c–" + maxSpeed / C + "c)<br>" +
		"view: " + ( godView ? "GOD (now, no delay)" : ( h.alive ? "OBSERVED (delay + aberration)" : "OBSERVED (delay + frozen last-β)" ) ) +
		"  c=" + C + " cells/s<br>" +
		"W/S speed · A/D or arrows turn · V god/observed · R restart · Space pause · you are cyan";
}

function tick( ts ) {
	if( !lastWall ) lastWall = ts;
	let dt = ( ts - lastWall ) / 1000;
	lastWall = ts;
	if( dt > 0.05 ) dt = 0.05;
	const h = world.human();
	if( running && h.alive ) {
		if( keys.has( "KeyW" ) ) world.adjustSpeed( h, speedRamp * dt );
		if( keys.has( "KeyS" ) ) world.adjustSpeed( h, -speedRamp * dt );
	}
	if( running ) {
		const obsFeel = ( h.alive && !godView ) ? h.properSpeed : 0;
		world.step( dt, obsFeel, botThink );
	}
	render();
	requestAnimationFrame( tick );
}

window.addEventListener( "keydown", ( ev ) => {
	const repeatTurn = keys.has( ev.code ) && ( ev.code === "KeyA" || ev.code === "KeyD" || ev.code === "ArrowLeft" || ev.code === "ArrowRight" );
	const repeatSpeed = keys.has( ev.code ) && ( ev.code === "KeyW" || ev.code === "KeyS" );
	if( repeatTurn || repeatSpeed ) return;
	keys.add( ev.code );
	const h = world.human();
	switch( ev.code ) {
	case "ArrowLeft":
	case "KeyA":
		world.requestTurn( h, +1 );
		ev.preventDefault();
		break;
	case "ArrowRight":
	case "KeyD":
		world.requestTurn( h, -1 );
		ev.preventDefault();
		break;
	case "KeyW":
		world.adjustSpeed( h, speedStep );
		ev.preventDefault();
		break;
	case "KeyS":
		world.adjustSpeed( h, -speedStep );
		ev.preventDefault();
		break;
	case "KeyV":
		godView = !godView;
		break;
	case "KeyR":
		reset();
		break;
	case "Space":
		running = !running;
		ev.preventDefault();
		break;
	}
} );

window.addEventListener( "keyup", ( ev ) => keys.delete( ev.code ) );

requestAnimationFrame( tick );