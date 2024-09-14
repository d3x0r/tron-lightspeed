export const C = 25;
export const CC = C*C;
export const boardSize = 960;
export const colors = [
	
]
export const directions = {
	north:0,
	west:1,
	south:2,
	east:3,
};
export const deltas = {
	north:{x:0,y:-1},
	west:{x:-1,y:0},
	south:{x:0,y:1},
	east:{x:1,y:0},
};


Object.freeze( directions );
Object.seal( directions );
Object.freeze( deltas );
Object.seal( deltas );
for( let d in deltas ) {
	Object.freeze( d );
	Object.seal( d );
}
