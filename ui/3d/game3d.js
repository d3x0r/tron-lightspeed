/**
 * First-person 3D local play. Same World / bots / encoding / speeds as 2D.
 * Renderer is three.js; aberration is STFR reception-side on n̂_ray then perspective.
 */
import { C, boardSize, palette, minSpeed, maxSpeed, speedRamp, speedStep } from "../gameConstants.js?v=20260902e";
import { DIR_DELTA } from "../cellEncoding.js?v=20260902e";
import { feelToReal, gammaFromFeel } from "../physics.js?v=20260902e";
import { World } from "../world.js?v=20260902e";
import { botThink } from "../bots.js?v=20260902e";
import { View3D, EYE_HEIGHT } from "./view3d.js?v=20260902e";

const hud = document.getElementById( "hud" );
const view = new View3D( document.getElementById( "game" ) );

let world = new World();
let godView = false;
let lastWall = 0;
let running = true;
const keys = new Set();

function reset() {
	world = new World();
	running = true;
	lastWall = 0;
	view.rebuildStatic( world );
}

function observerState() {
	const h = world.human();
	const d = DIR_DELTA[ h.dir ];
	const x = h.x + 0.5 + d.x * h.frac;
	const z = h.y + 0.5 + d.y * h.frac;
	if( godView ) {
		return {
			x, y: EYE_HEIGHT, z,
			vx: 0, vy: 0, vz: 0,
			feel: 0,
			selfId: h.id,
			dir: h.dir,
			hx: d.x, hz: d.y,
			aberrate: false,
			god: true,
			tObs: world.tWorld,
		};
	}
	return {
		x, y: EYE_HEIGHT, z,
		vx: h.viewVx, vy: 0, vz: h.viewVy,
		feel: h.viewFeel,
		selfId: h.id,
		dir: h.dir,
		hx: d.x, hz: d.y,
		aberrate: ( h.viewVx !== 0 || h.viewVy !== 0 ),
		god: false,
		tObs: world.tWorld,
	};
}

function render() {
	const obs = observerState();
	view.sync( world, obs );
	view.render();

	const h = world.human();
	const g = gammaFromFeel( obs.feel );
	const vReal = feelToReal( obs.feel );
	const status = h.alive ? "RIDING" : "CRASHED (view frozen)";
	const others = world.cycles.filter( c => !c.human && c.alive ).length;
	hud.innerHTML =
		"<b>TRON Lightspeed — 3D first-person</b>  " + status + "  bots alive " + others + "/3<br>" +
		"world t=" + world.tWorld.toFixed( 2 ) + "s  proper t=" + world.tProper.toFixed( 2 ) + "s  gamma=" + g.toFixed( 2 ) + "  " +
		"SPEED  v_feel=" + ( obs.feel / C ).toFixed( 2 ) + "c  v_real=" + ( vReal / C ).toFixed( 2 ) + "c  " +
		"(" + minSpeed / C + "c–" + maxSpeed / C + "c)<br>" +
		"view: " + ( godView ? "GOD (now, no delay / no aberration)" : ( h.alive ? "OBSERVED (delay + STFR aberration + perspective)" : "OBSERVED (delay + frozen last-β)" ) ) +
		"  c=" + C + " cells/s<br>" +
		"W/S speed · A/D or arrows turn · V god/observed · R restart · Space pause · you are cyan · 2D at /";
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
window.addEventListener( "resize", () => view.resize() );

view.rebuildStatic( world );
requestAnimationFrame( tick );