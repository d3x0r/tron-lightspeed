/**
 * three.js first-person view. Vertices are placed along STFR-aberrated
 * incoming rays (Eq 7.7 + App B.5/B.7) then drawn with a normal perspective camera.
 */
import * as THREE from "three";
import { boardSize, palette, pillarHues } from "../gameConstants.js?v=20260902e";
import { cellId, cellIn, cellOut, isPillar, isWall, DIR_DELTA } from "../cellEncoding.js?v=20260902e";
import { lightDelay, lightDelay3, apparentPos3 } from "../physics.js?v=20260902e";

export const EYE_HEIGHT = 1.2;
export const WALL_HEIGHT = 3;
export const PILLAR_HEIGHT = 8;
export const FOV = 80;
const HALF_W = 0.18;
const HIDE_Y = -40;
const OWN_NEAR = 0.8;
const EYE_NEAR = 1.5;
const VERTS = 8;
const INDS = 30;
const FLOOR_SEGS = 72;
const BORDER_H = 14;

function pal( id ) {
	const c = palette[ id ] || palette[ 6 ];
	return [ c[ 0 ] / 255, c[ 1 ] / 255, c[ 2 ] / 255 ];
}

function edgeMid( x, y, dir ) {
	switch( dir ) {
	case 0: return [ x + 0.5, y ];
	case 1: return [ x, y + 0.5 ];
	case 2: return [ x + 0.5, y + 1 ];
	case 3: return [ x + 1, y + 0.5 ];
	default: return [ x + 0.5, y + 0.5 ];
	}
}


function fillWallVerts( base, o, x, y, inDir, outDir ) {
	const a = edgeMid( x, y, inDir );
	const b = edgeMid( x, y, outDir );
	let dx = b[ 0 ] - a[ 0 ];
	let dz = b[ 1 ] - a[ 1 ];
	const len = Math.hypot( dx, dz ) || 1;
	dx /= len; dz /= len;
	const px = -dz * HALF_W;
	const pz = dx * HALF_W;
	const inL = [ a[ 0 ] + px, a[ 1 ] + pz ];
	const inR = [ a[ 0 ] - px, a[ 1 ] - pz ];
	const outL = [ b[ 0 ] + px, b[ 1 ] + pz ];
	const outR = [ b[ 0 ] - px, b[ 1 ] - pz ];
	const pts = [ inL, inR, outL, outR ];
	for( let k = 0; k < 4; k++ ) {
		base[ o + k * 3 ] = pts[ k ][ 0 ];
		base[ o + k * 3 + 1 ] = 0;
		base[ o + k * 3 + 2 ] = pts[ k ][ 1 ];
		base[ o + 12 + k * 3 ] = pts[ k ][ 0 ];
		base[ o + 12 + k * 3 + 1 ] = WALL_HEIGHT;
		base[ o + 12 + k * 3 + 2 ] = pts[ k ][ 1 ];
	}
}

function fillWallIndex( idx, cell, baseVert ) {
	const v = baseVert;
	const quads = [
		[ 0, 2, 6, 4 ], // left
		[ 3, 1, 5, 7 ], // right
		[ 4, 6, 7, 5 ], // top
		[ 1, 0, 4, 5 ], // in cap
		[ 2, 3, 7, 6 ], // out cap
	];
	let p = cell * INDS;
	for( const q of quads ) {
		idx[ p++ ] = v + q[ 0 ];
		idx[ p++ ] = v + q[ 1 ];
		idx[ p++ ] = v + q[ 2 ];
		idx[ p++ ] = v + q[ 0 ];
		idx[ p++ ] = v + q[ 2 ];
		idx[ p++ ] = v + q[ 3 ];
	}
}

function hideTrailVerts( tpos, o, x, z ) {
	for( let v = 0; v < VERTS; v++ ) {
		tpos[ o + v * 3 ] = x;
		tpos[ o + v * 3 + 1 ] = HIDE_Y;
		tpos[ o + v * 3 + 2 ] = z;
	}
}

/** Own trail: current cell is hidden by caller. Extra: only geometry inside the bike (3D dist < OWN_NEAR). No forward half-space clip. */
function ownTrailHide( m, obs, base, o ) {
	const cx = m.x + 0.5;
	const cz = m.y + 0.5;
	if( Math.hypot( cx - obs.x, 0 - obs.y, cz - obs.z ) < OWN_NEAR ) return true;
	for( let v = 0; v < VERTS; v++ ) {
		const i = o + v * 3;
		const vx = base[ i ] - obs.x;
		const vy = base[ i + 1 ] - obs.y;
		const vz = base[ i + 2 ] - obs.z;
		if( Math.hypot( vx, vy, vz ) < OWN_NEAR ) return true;
	}
	return false;
}

function warpInto( src, dst, n, obs ) {
	if( !obs.aberrate ) {
		dst.set( src.subarray( 0, n ) );
		return;
	}
	const ox = obs.x, oy = obs.y, oz = obs.z;
	const vx = obs.vx, vy = obs.vy, vz = obs.vz;
	for( let i = 0; i < n; i += 3 ) {
		const sx = src[ i ], sy = src[ i + 1 ], sz = src[ i + 2 ];
		// Nearby n-hat is unstable / nearly parallel to v-hat; keep world (do not sling through apparentPos3).
		if( Math.hypot( sx - ox, sy - oy, sz - oz ) < EYE_NEAR ) {
			dst[ i ] = sx;
			dst[ i + 1 ] = sy;
			dst[ i + 2 ] = sz;
			continue;
		}
		const p = apparentPos3( sx, sy, sz, ox, oy, oz, vx, vy, vz );
		dst[ i ] = p.x;
		dst[ i + 1 ] = p.y;
		dst[ i + 2 ] = p.z;
	}
}

function pillarRects( world ) {
	const size = world.size;
	const seen = new Uint8Array( size * size );
	const rects = [];
	for( const i of world.pillars ) {
		if( seen[ i ] ) continue;
		const q = [ i ];
		seen[ i ] = 1;
		let minx = size, miny = size, maxx = -1, maxy = -1;
		while( q.length ) {
			const j = q.pop();
			const x = j % size;
			const y = ( j / size ) | 0;
			if( x < minx ) minx = x;
			if( y < miny ) miny = y;
			if( x > maxx ) maxx = x;
			if( y > maxy ) maxy = y;
			const nbs = [ j - 1, j + 1, j - size, j + size ];
			for( const n of nbs ) {
				if( n < 0 || n >= size * size || seen[ n ] ) continue;
				if( !isPillar( world.cells[ n ] ) ) continue;
				seen[ n ] = 1;
				q.push( n );
			}
		}
		rects.push( { x0: minx, y0: miny, x1: maxx + 1, y1: maxy + 1 } );
	}
	return rects;
}

export class View3D {
	constructor( container ) {
		this.container = container;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0x000000 );
		this.camera = new THREE.PerspectiveCamera( FOV, window.innerWidth / Math.max( 1, window.innerHeight ), 0.08, 2800 );
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 2 ) );
		this.renderer.setClearColor( 0x000000, 1 );
		this.resize();
		container.appendChild( this.renderer.domElement );

		this.floor = null;
		this.floorBase = null;
		this.grid = null;
		this.gridBase = null;
		this.border = null;
		this.borderBase = null;
		this.pillars = [];
		this.cycles = [];
		this.trail = this.makeTrail( 2048 );
		this.scene.add( this.trail.mesh );
		this.trailCursor = 0;
	}

	resize() {
		const w = window.innerWidth;
		const h = Math.max( 1, window.innerHeight );
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( w, h );
	}

	makeTrail( cap ) {
		const pos = new Float32Array( cap * VERTS * 3 );
		const col = new Float32Array( cap * VERTS * 3 );
		const idx = new Uint32Array( cap * INDS );
		for( let c = 0; c < cap; c++ ) fillWallIndex( idx, c, c * VERTS );
		const geom = new THREE.BufferGeometry();
		geom.setAttribute( "position", new THREE.BufferAttribute( pos, 3 ) );
		geom.setAttribute( "color", new THREE.BufferAttribute( col, 3 ) );
		geom.setIndex( new THREE.BufferAttribute( idx, 1 ) );
		geom.setDrawRange( 0, 0 );
		const mat = new THREE.MeshBasicMaterial( { vertexColors: true, side: THREE.DoubleSide } );
		const mesh = new THREE.Mesh( geom, mat );
		mesh.frustumCulled = false;
		return {
			cap,
			count: 0,
			base: new Float32Array( cap * VERTS * 3 ),
			meta: [],
			geom, mesh,
		};
	}

	growTrail( need ) {
		let cap = this.trail.cap;
		while( cap < need ) cap *= 2;
		const next = this.makeTrail( cap );
		next.base.set( this.trail.base );
		next.meta = this.trail.meta;
		next.count = this.trail.count;
		next.geom.attributes.color.array.set( this.trail.geom.attributes.color.array );
		this.scene.remove( this.trail.mesh );
		this.trail.geom.dispose();
		this.trail.mesh.material.dispose();
		this.trail = next;
		this.scene.add( this.trail.mesh );
	}

	rebuildStatic( world ) {
		this.clearStatic();
		this.buildFloor();
		this.buildGrid();
		this.buildBorder();
		this.buildPillars( world );
		this.buildCycles( world );
		this.trailCursor = 0;
		this.trail.count = 0;
		this.trail.meta = [];
		this.trail.geom.setDrawRange( 0, 0 );
	}

	clearStatic() {
		const drop = ( obj ) => {
			if( !obj ) return;
			this.scene.remove( obj );
			if( obj.geometry ) obj.geometry.dispose();
			if( obj.material ) obj.material.dispose();
		};
		drop( this.floor );
		drop( this.grid );
		drop( this.border );
		for( const p of this.pillars ) drop( p.mesh );
		for( const c of this.cycles ) drop( c.mesh );
		this.floor = this.grid = this.border = null;
		this.pillars = [];
		this.cycles = [];
	}

	buildFloor() {
		const g = new THREE.PlaneGeometry( boardSize, boardSize, FLOOR_SEGS, FLOOR_SEGS );
		g.rotateX( -Math.PI / 2 );
		g.translate( boardSize / 2, 0, boardSize / 2 );
		this.floorBase = new Float32Array( g.attributes.position.array );
		const mat = new THREE.MeshBasicMaterial( { color: 0x07090e, side: THREE.DoubleSide } );
		this.floor = new THREE.Mesh( g, mat );
		this.floor.frustumCulled = false;
		this.scene.add( this.floor );
	}

	buildGrid() {
		const step = 50;
		const pts = [];
		for( let i = 0; i <= boardSize; i += step ) {
			pts.push( 0, 0.02, i, boardSize, 0.02, i );
			pts.push( i, 0.02, 0, i, 0.02, boardSize );
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute( "position", new THREE.Float32BufferAttribute( pts, 3 ) );
		this.gridBase = new Float32Array( g.attributes.position.array );
		this.grid = new THREE.LineSegments( g, new THREE.LineBasicMaterial( { color: 0x1a3344 } ) );
		this.grid.frustumCulled = false;
		this.scene.add( this.grid );
	}

	buildBorder() {
		const segs = 50;
		const parts = [
			new THREE.BoxGeometry( boardSize + 2, BORDER_H, 1.2, segs, 2, 1 ),
			new THREE.BoxGeometry( boardSize + 2, BORDER_H, 1.2, segs, 2, 1 ),
			new THREE.BoxGeometry( 1.2, BORDER_H, boardSize + 2, 1, 2, segs ),
			new THREE.BoxGeometry( 1.2, BORDER_H, boardSize + 2, 1, 2, segs ),
		];
		parts[ 0 ].translate( boardSize / 2, BORDER_H / 2, -0.6 );
		parts[ 1 ].translate( boardSize / 2, BORDER_H / 2, boardSize + 0.6 );
		parts[ 2 ].translate( -0.6, BORDER_H / 2, boardSize / 2 );
		parts[ 3 ].translate( boardSize + 0.6, BORDER_H / 2, boardSize / 2 );
		const g = mergeGeoms( parts );
		this.borderBase = new Float32Array( g.attributes.position.array );
		this.border = new THREE.Mesh( g, new THREE.MeshBasicMaterial( { color: 0x2a3148, side: THREE.DoubleSide } ) );
		this.border.frustumCulled = false;
		this.scene.add( this.border );
	}

	buildPillars( world ) {
		const rects = pillarRects( world );
		for( const r of rects ) {
			const w = r.x1 - r.x0;
			const d = r.y1 - r.y0;
			const sx = Math.max( 4, ( w / 3 ) | 0 );
			const sz = Math.max( 4, ( d / 3 ) | 0 );
			const g = new THREE.BoxGeometry( w, PILLAR_HEIGHT, d, sx, 3, sz );
			g.translate( ( r.x0 + r.x1 ) / 2, PILLAR_HEIGHT / 2, ( r.y0 + r.y1 ) / 2 );
			const mat = new THREE.MeshBasicMaterial( { color: 0x555566, side: THREE.DoubleSide } );
			const mesh = new THREE.Mesh( g, mat );
			mesh.frustumCulled = false;
			this.scene.add( mesh );
			this.pillars.push( {
				mesh,
				base: new Float32Array( g.attributes.position.array ),
				cx: ( r.x0 + r.x1 ) / 2,
				cy: PILLAR_HEIGHT / 2,
				cz: ( r.y0 + r.y1 ) / 2,
			} );
		}
	}

	buildCycles( world ) {
		for( const cyc of world.cycles ) {
			if( cyc.human ) continue;
			const g = new THREE.BoxGeometry( 0.55, 0.4, 1.2 );
			const col = pal( cyc.id );
			const mat = new THREE.MeshBasicMaterial( { color: new THREE.Color( col[ 0 ], col[ 1 ], col[ 2 ] ) } );
			const mesh = new THREE.Mesh( g, mat );
			mesh.frustumCulled = false;
			this.scene.add( mesh );
			this.cycles.push( { mesh, id: cyc.id, baseLocal: new Float32Array( g.attributes.position.array ) } );
		}
	}

	appendTrails( world ) {
		const n = world.trail.length;
		if( n > this.trail.cap ) this.growTrail( n );
		for( let t = this.trailCursor; t < n; t++ ) {
			const i = world.trail[ t ];
			const word = world.cells[ i ];
			if( !word || isPillar( word ) || isWall( word ) ) {
				this.trailCursor = t + 1;
				continue;
			}
			const id = cellId( word );
			const x = i % boardSize;
			const y = ( i / boardSize ) | 0;
			const slot = this.trail.count;
			if( slot >= this.trail.cap ) this.growTrail( slot + 1 );
			const o = slot * VERTS * 3;
			fillWallVerts( this.trail.base, o, x, y, cellIn( word ), cellOut( word ) );
			const rgb = pal( id );
			const ca = this.trail.geom.attributes.color.array;
			for( let v = 0; v < VERTS; v++ ) {
				ca[ o + v * 3 ] = rgb[ 0 ];
				ca[ o + v * 3 + 1 ] = rgb[ 1 ];
				ca[ o + v * 3 + 2 ] = rgb[ 2 ];
			}
			this.trail.meta[ slot ] = { id, x, y, tWrite: world.time[ i ], i, out: cellOut( word ) };
			this.trail.count = slot + 1;
			this.trailCursor = t + 1;
		}
		this.trail.geom.attributes.color.needsUpdate = true;
		this.trail.geom.setDrawRange( 0, this.trail.count * INDS );
	}

	sync( world, obs ) {
		this.appendTrails( world );
		this.camera.position.set( obs.x, obs.y, obs.z );
		this.camera.up.set( 0, 1, 0 );
		this.camera.lookAt( obs.x + obs.hx, obs.y, obs.z + obs.hz );

		warpInto( this.floorBase, this.floor.geometry.attributes.position.array, this.floorBase.length, obs );
		this.floor.geometry.attributes.position.needsUpdate = true;
		warpInto( this.gridBase, this.grid.geometry.attributes.position.array, this.gridBase.length, obs );
		this.grid.geometry.attributes.position.needsUpdate = true;
		warpInto( this.borderBase, this.border.geometry.attributes.position.array, this.borderBase.length, obs );
		this.border.geometry.attributes.position.needsUpdate = true;

		for( const p of this.pillars ) {
			const delay = obs.god ? 0 : lightDelay3( p.cx, p.cy, p.cz, obs.x, obs.y, obs.z );
			const seen = obs.tObs - delay;
			if( seen < 0 && !obs.god ) {
				p.mesh.visible = false;
				continue;
			}
			p.mesh.visible = true;
			const hue = pillarHues[ ( ( seen | 0 ) % pillarHues.length + pillarHues.length ) % pillarHues.length ];
			p.mesh.material.color.setRGB( hue[ 0 ] / 255, hue[ 1 ] / 255, hue[ 2 ] / 255 );
			warpInto( p.base, p.mesh.geometry.attributes.position.array, p.base.length, obs );
			p.mesh.geometry.attributes.position.needsUpdate = true;
		}

		const me = world.human();
		const tpos = this.trail.geom.attributes.position.array;
		for( let s = 0; s < this.trail.count; s++ ) {
			const m0 = this.trail.meta[ s ];
			const w0 = world.cells[ m0.i ];
			if( w0 ) {
				const out0 = cellOut( w0 );
				if( out0 !== m0.out ) {
					fillWallVerts( this.trail.base, s * VERTS * 3, m0.x, m0.y, cellIn( w0 ), out0 );
					m0.out = out0;
				}
			}
		}
		for( let s = 0; s < this.trail.count; s++ ) {
			const m = this.trail.meta[ s ];
			const o = s * VERTS * 3;
			const own = m.id === obs.selfId;
			const cx = m.x + 0.5;
			const cz = m.y + 0.5;
			if( own ) {
				// Same as 2D: own trail is never aberrated (world positions).
				// Hide only the current cell (camera inside ribbon) and geometry inside the bike.
				if( ( me && m.x === me.x && m.y === me.y ) || ownTrailHide( m, obs, this.trail.base, o ) ) {
					hideTrailVerts( tpos, o, cx, cz );
					continue;
				}
				tpos.set( this.trail.base.subarray( o, o + VERTS * 3 ), o );
				continue;
			}
			if( !obs.god ) {
				if( m.tWrite + lightDelay( m.x + 0.5, m.y + 0.5, obs.x, obs.z ) > obs.tObs ) {
					hideTrailVerts( tpos, o, cx, cz );
					continue;
				}
			}
			if( obs.aberrate ) {
				for( let v = 0; v < VERTS; v++ ) {
					const i = o + v * 3;
					const sx = this.trail.base[ i ];
					const sy = this.trail.base[ i + 1 ];
					const sz = this.trail.base[ i + 2 ];
					if( Math.hypot( sx - obs.x, sy - obs.y, sz - obs.z ) < EYE_NEAR ) {
						tpos[ i ] = sx;
						tpos[ i + 1 ] = sy;
						tpos[ i + 2 ] = sz;
					} else {
						const p = apparentPos3( sx, sy, sz, obs.x, obs.y, obs.z, obs.vx, obs.vy, obs.vz );
						tpos[ i ] = p.x;
						tpos[ i + 1 ] = p.y;
						tpos[ i + 2 ] = p.z;
					}
				}
			} else {
				tpos.set( this.trail.base.subarray( o, o + VERTS * 3 ), o );
			}
		}
		this.trail.geom.attributes.position.needsUpdate = true;

		let ci = 0;
		for( const cyc of world.cycles ) {
			if( cyc.human ) continue;
			const rec = this.cycles[ ci++ ];
			if( !rec ) continue;
			const own = cyc.id === obs.selfId;
			if( !obs.god && !own ) {
				if( world.time[ world.idx( cyc.x, cyc.y ) ] + lightDelay( cyc.x + 0.5, cyc.y + 0.5, obs.x, obs.z ) > obs.tObs ) {
					rec.mesh.visible = false;
					continue;
				}
			}
			rec.mesh.visible = true;
			const d = DIR_DELTA[ cyc.dir ];
			const cx = cyc.x + 0.5 + d.x * cyc.frac;
			const cz = cyc.y + 0.5 + d.y * cyc.frac;
			const cy = 0.22;
			const hx = d.x, hz = d.y;
			const rx = -hz, rz = hx;
			const arr = rec.mesh.geometry.attributes.position.array;
			const src = rec.baseLocal;
			const dim = cyc.alive ? 1 : 0.45;
			const rgb = pal( cyc.id );
			rec.mesh.material.color.setRGB( rgb[ 0 ] * dim, rgb[ 1 ] * dim, rgb[ 2 ] * dim );
			for( let v = 0; v < src.length; v += 3 ) {
				const lx = src[ v ], ly = src[ v + 1 ], lz = src[ v + 2 ];
				const wx = cx + rx * lx + hx * lz;
				const wy = cy + ly;
				const wz = cz + rz * lx + hz * lz;
				if( obs.aberrate && Math.hypot( wx - obs.x, wy - obs.y, wz - obs.z ) >= EYE_NEAR ) {
					const p = apparentPos3( wx, wy, wz, obs.x, obs.y, obs.z, obs.vx, obs.vy, obs.vz );
					arr[ v ] = p.x; arr[ v + 1 ] = p.y; arr[ v + 2 ] = p.z;
				} else {
					arr[ v ] = wx; arr[ v + 1 ] = wy; arr[ v + 2 ] = wz;
				}
			}
			rec.mesh.geometry.attributes.position.needsUpdate = true;
		}
	}

	render() {
		this.renderer.render( this.scene, this.camera );
	}
}

function mergeGeoms( geoms ) {
	const n = geoms.reduce( ( s, g ) => s + g.attributes.position.count, 0 );
	const pos = new Float32Array( n * 3 );
	let w = 0;
	for( const g of geoms ) {
		pos.set( g.attributes.position.array, w );
		w += g.attributes.position.array.length;
		g.dispose();
	}
	const out = new THREE.BufferGeometry();
	out.setAttribute( "position", new THREE.BufferAttribute( pos, 3 ) );
	return out;
}