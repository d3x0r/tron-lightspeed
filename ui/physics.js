/**
 * Light delay + observer-relative aberration for the top-down view.
 *
 * Authoritative model (do not substitute textbook/outside aberration):
 *   M:\javascript\carwars\dual-quat\STFRPhysics\AI\Revised\homogeneous_light_propagation_framework.md
 *
 * Used here:
 *   Eq (2.2) native propagation: ||x_o(t_o) - x_s(t_e)|| = c (t_o - t_e)
 *   Eq (5.5) / §5.2  γ(v) = 1/√(1-v²/c²)  local-clock dilation (two-way cost)
 *   Eq (4.8)         λ(v) = √(1-v²/c²)    longitudinal contraction
 *   Eq (7.7) / App B observer-side (reception) aberration only
 *
 * User spec for this game: aberration is observer-relative only. No Doppler.
 * Trails are at rest in the transport structure after they are written, so
 * emission-side aberration is skipped; we only rotate the incoming look
 * direction at the receiver (Appendix B.7).
 *
 * Feel/proper speed may exceed c (STFR). Coordinate speed is always < c:
 *   v_real = v_feel * c / √(c² + v_feel²)
 * which is the mapping already used in ui/span.js getReal().
 * Then λ(v_real) = √(c² / (c² + v_feel²)) and γ = 1/λ.
 */
import { C, CC } from "./gameConstants.js";

export function feelToReal( vFeel ) {
	return vFeel * C / Math.sqrt( CC + vFeel * vFeel );
}

/** λ(v) contraction / existing gammaFromFL. */
export function lambdaFromFeel( vFeel ) {
	return Math.sqrt( CC / ( vFeel * vFeel + CC ) );
}

/** γ(v) from §5.2 — enlarged two-way interaction cost. */
export function gammaFromFeel( vFeel ) {
	return 1 / lambdaFromFeel( vFeel );
}

/**
 * Static source at (sx,sy) written at tWrite (world seconds).
 * Visible to observer at (ox,oy) at tObs iff the native delay has elapsed.
 * Eq (2.2): delay = ||x_o(t_o) - x_s|| / c.
 */
export function lightDelay( sx, sy, ox, oy ) {
	return Math.hypot( sx - ox, sy - oy ) / C;
}

export function isVisible( sx, sy, tWrite, ox, oy, tObs ) {
	return tWrite + lightDelay( sx, sy, ox, oy ) <= tObs;
}

/**
 * Reception-side signed planar aberration (Appendix B.4 + Eq 7.7).
 *
 * Eq (7.7) acts on the incoming-ray angle n̂_ray (source → observer), not
 * the look angle (observer → source). Applying (cosθ−β)/(1−β cosθ) to look
 * inverted the on-screen deflection; A_R is B.7 / (B.10) on n̂_ray. Apparent
 * look is opposite n̂'. (Look-side equivalent: (cos+β)/(1+β cos).)
 *
 * β uses COORDINATE speed (feelToReal), so β < 1 even at 2.5c proper.
 *
 * Returns apparent board coordinates, same radial distance (no Doppler,
 * no range remix — delay already chose which event we see).
 */
export function apparentPos( sx, sy, ox, oy, vx, vy ) {
	const dx = sx - ox;
	const dy = sy - oy;
	const dist = Math.hypot( dx, dy );
	if( dist < 1e-6 ) return { x: sx, y: sy };
	const speed = Math.hypot( vx, vy );
	if( speed < 1e-9 ) return { x: sx, y: sy };
	const beta = Math.min( speed / C, 0.999 );
	// Incoming-ray angle n̂_ray (source → observer). Eq (7.7) is on this, not look.
	const ray = Math.atan2( -dy, -dx );
	const phi = Math.atan2( vy, vx );
	const a = ray - phi;
	const cos = Math.cos( a );
	const sin = Math.sin( a );
	const denom = 1 - beta * cos;
	if( Math.abs( denom ) < 1e-12 ) return { x: sx, y: sy };
	const cosP = ( cos - beta ) / denom;
	let aP = Math.acos( Math.max( -1, Math.min( 1, cosP ) ) );
	// Appendix B.4: restore side-of-line lost by arccos
	if( sin < 0 ) aP = -aP;
	const rayP = aP + phi;
	return {
		x: ox + dist * Math.cos( rayP + Math.PI ),
		y: oy + dist * Math.sin( rayP + Math.PI ),
	};
}
