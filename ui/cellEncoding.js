/**
 * Grid cell encoding for tron-lightspeed.
 *
 * Direction codes (user spec):
 *   0 north, 1 west/left, 2 south/down, 3 east/right
 *
 * Each occupied trail cell is a uint16 packing of player-id + turn + IN-edge
 * + flags. Time-of-write lives in a parallel Float32Array (world seconds).
 *
 * Nibbles of the uint16 (high → low):
 *   bits 15-12  occupant id   0 = empty, 1..15 = player/pillar id
 *   bits 11-8   turn code     0 = straight, 1 = exit toward IN+3,
 *                             2 = u-turn (unused), 3 = exit toward IN+1
 *   bits  7-4   IN direction  edge the cycle ENTERED FROM
 *   bits  3-0   flags         bit0 = pillar, bit1 = permanent wall
 *
 * OUT edge = (IN + 2 + turn) % 4
 *
 * Matching the user's sketch:
 *   0x1000 = id=1, turn=straight, IN=north → OUT=south/down
 *            (entered from north, traveling south, went straight)
 *   0x1100 = id=1, turn=1,        IN=north → OUT=east/right
 *            (entered from north, turned, exited east — a turn in the cell)
 *
 * Traveling in direction D, a straight cell therefore has
 *   IN  = opposite(D) = (D + 2) % 4
 *   OUT = D
 *   turn = 0
 *
 * A rider turn of +1 (left, +90° CCW in this dir numbering) or -1 (right)
 * rewrites OUT and the turn nibble before leaving the cell.
 * Turn resolution IS the grid: you only change heading inside a cell.
 */
export const DIR_N = 0;
export const DIR_W = 1;
export const DIR_S = 2;
export const DIR_E = 3;

export const FLAG_PILLAR = 1;
export const FLAG_WALL = 2;

export const DIR_DELTA = [
	{ x: 0, y: -1 }, // N
	{ x: -1, y: 0 }, // W
	{ x: 0, y: 1 },  // S
	{ x: 1, y: 0 },  // E
];

export const DIR_NAME = [ "N", "W", "S", "E" ];

export function opposite( dir ) {
	return ( dir + 2 ) & 3;
}

export function turnDir( dir, turn /* +1 left, -1 right */ ) {
	return ( dir + turn + 4 ) & 3;
}

/**
 * turn nibble from IN-edge and OUT-edge.
 * 0 straight, 1 = OUT is IN+3, 3 = OUT is IN+1, 2 = u-turn.
 */
export function turnNibble( inDir, outDir ) {
	return ( outDir - inDir - 2 + 8 ) & 3;
}

export function packCell( id, inDir, outDir, flags = 0 ) {
	const turn = turnNibble( inDir, outDir );
	return ( ( id & 15 ) << 12 ) | ( ( turn & 15 ) << 8 ) | ( ( inDir & 15 ) << 4 ) | ( flags & 15 );
}

export function packPillar( id ) {
	return ( ( id & 15 ) << 12 ) | FLAG_PILLAR;
}

export function packWall() {
	return FLAG_WALL;
}

export function cellId( word ) { return ( word >> 12 ) & 15; }
export function cellTurn( word ) { return ( word >> 8 ) & 15; }
export function cellIn( word ) { return ( word >> 4 ) & 15; }
export function cellOut( word ) { return ( cellIn( word ) + 2 + cellTurn( word ) ) & 3; }
export function cellFlags( word ) { return word & 15; }
export function isOccupied( word ) { return word !== 0; }
export function isPillar( word ) { return ( word & FLAG_PILLAR ) !== 0; }
export function isWall( word ) { return ( word & FLAG_WALL ) !== 0; }

