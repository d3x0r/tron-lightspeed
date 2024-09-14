import {directions} from "./constants.js"
import {SpanList} from "./spanList.js";
import {Span} from "./span.js";
import {C} from "./constants.js"
export class Token {
	x = 0;
	y = 0;
	spd = 0;
	gamma = 0;
	tick = 0; // real time
	clock = 0; // feels-like time
	tail = new SpanList();
	X = {x:0,y:0}
	V = {x:0,y:0}
	A = {x:0,y:0}
	stopped = false;
	// directions:
	direction = directions.north;
	directionAt = 0;
	board = null;
	onstop = null;

	stop() {
		this.stopped = true;
	}

	collide( token ) {
		// test both token and this last segments vs all segments in other's tail
		// if the last collides, then stop the last guy which collided.  It may be possible
		// that in a single tick, that both tokens are stopped.
		// 1) they are both stopped (no point to either for being not-stopped at end)
		// 2) In that case, the first one to collide will be the one that stops the other.
		
		const last = this.tail.last;
		const last2 = token.tail.last;

		// check last with all segments in token
		{
			let cur = token.tail.reset( true );

			if( last.direction == 0 || last.direction == 2 ) {
				do {
					if( cur.direction ==1 || cur.direction == 3) {
						//console.log( "Test segment collision (a<B*b>A  B=A)", cur.X.s.x, last.X.e.x, cur.X.e.x, last.X.s.x );
						if( ( cur.X.s.x < last.X.e.x && cur.X.e.x > last.X.s.x )
							||( cur.X.s.x > last.X.e.x && cur.X.e.x < last.X.s.x ) ) {
							//console.log( "yes.... and (a<B*b>A  B=A)", last.X.s.y, cur.X.s.y,last.X.e.y, cur.X.e.y );
							if ( ( last.X.s.y < cur.X.s.y && last.X.e.y > cur.X.e.y )
								|| ( last.X.s.y > cur.X.s.y && last.X.e.y < cur.X.e.y )) {
								// collision
								//console.log( "STOP!" );
								this.tail.onstop( );
							}
						}
					}
				}while( cur = token.tail.next() );
			}
			if( last.direction == 1 || last.direction == 3 ) {
				do {
					if( cur.direction ==0 || cur.direction == 2) {
						//console.log( "Test segment collision (a<B*b>A  B=A)", cur.X.s.y, last.X.e.y, cur.X.e.y, last.X.s.y );
						if( ( cur.X.s.y < last.X.e.y && cur.X.e.y > last.X.s.y ) 
							||( cur.X.e.y < last.X.e.y && cur.X.s.y > last.X.s.y ) ) {
								//console.log( "yes.... and (a<B*b>A  B=A)", last.X.s.x, cur.X.s.x,last.X.e.x, cur.X.e.x );
							if( ( last.X.s.x < cur.X.s.x && last.X.e.x > cur.X.e.x )
								|| ( last.X.s.x > cur.X.s.x && last.X.e.x < cur.X.e.x ) ) {
								// collision
								this.tail.onstop( );
							}
						}
					}
				}while( cur = token.tail.next() );
			}
		}


		{
			let cur = this.tail.reset( true );

			if( last2.direction == 0 || last2.direction == 2 ) {
				do {
					if( cur.direction ==1 || cur.direction == 3) {
						//console.log( "Test segment collision (a<B*b>A  B=A)", cur.X.s.x, last2.X.e.x, cur.X.e.x, last2.X.s.x );
						if( ( cur.X.s.x < last2.X.e.x && cur.X.e.x > last2.X.s.x )
							||( cur.X.s.x > last2.X.e.x && cur.X.e.x < last2.X.s.x ) ) {
							//console.log( "yes.... and (a<B*b>A  B=A)", last2.X.s.y, cur.X.s.y,last2.X.e.y, cur.X.e.y );
							if ( ( last2.X.s.y < cur.X.s.y && last2.X.e.y > cur.X.e.y )
								|| ( last2.X.s.y > cur.X.s.y && last2.X.e.y < cur.X.e.y )) {
								// collision
								//console.log( "STOP!" );
								this.tail.onstop( );
							}
						}
					}
				}while( cur = token.tail.next() );
			}
			if( last2.direction == 1 || last2.direction == 3 ) {
				do {
					if( cur.direction ==0 || cur.direction == 2) {
						//console.log( "Test segment collision (a<B*b>A  B=A)", cur.X.s.y, last2.X.e.y, cur.X.e.y, last2.X.s.y );
						if( ( cur.X.s.y < last2.X.e.y && cur.X.e.y > last2.X.s.y ) 
							||( cur.X.e.y < last2.X.e.y && cur.X.s.y > last2.X.s.y ) ) {
								//console.log( "yes.... and (a<B*b>A  B=A)", last2.X.s.x, cur.X.s.x,last2.X.e.x, cur.X.e.x );
							if( ( last2.X.s.x < cur.X.s.x && last2.X.e.x > cur.X.e.x )
								|| ( last2.X.s.x > cur.X.s.x && last2.X.e.x < cur.X.e.x ) ) {
								// collision
								token.tail.onstop( );
							}
						}
					}
				}while( cur = this.tail.next() );
			}
		}
		return ge;
	}

	constructor( board, user, x, y, d ) {
		this.name = user.name;
		const start = new Span( this.tail, {X:{x:x,y:y},Vs:0,A:0, As:0,direction:d, start:performance.now()} );
		start.end = start.start;
		start.update();
		this.x = x;
		this.y = y;
		this.board = board;
	}

	
	// cruise
	move( ts, rts, delts, delreal ){
		if( this.stopped ) return;
		const last = this.tail.last;		
		last.end = ts;
		this.tick = rts;
		this.clock = ts;
		last.update();
		//console.log( "Tick update:", last.X.e, last.Ae, last.Ve);
	}
	turnTo( d ) {
		if( this.stopped ) return;
		this.direction = this.tail.last.direction;
		//this.direction = d;
	}
	turn( d, ts, rts ) {
		if( this.stopped ) return;
		if( d > 0 ) {
			this.direction = (this.direction + d)%4;
		} else if ( d < 0 ) {
			this.direction = (this.direction + d + 4)%4;
		}
		this.tail.turnTo( this.direction, ts );
		this.clock = ts;
		this.tick = rts;
	}
	accel( n, ts, rts ) {
		if( this.stopped ) return;
		this.A = n; // sort of redudant variable...
		this.tail.accelerate( C, ts, rts );
		//console.log( "accel", C, ts );
		this.clock = ts;
		this.tick = rts;
	}
	decel( n, ts, rts ) {
		if( this.stopped ) return;
		this.A = -n; // sort of redudant variable...
		this.tail.accelerate( -C, ts );
		//console.log( "decel", -C, ts );
		this.clock = ts;
		this.tick = rts;
	}
	cruise(ts, rts) {
		if( this.stopped ) return;
		this.A = 0; // sort of redudant variable...
		this.tail.accelerate( 0, ts );
		//console.log( "cruise" )

		this.clock = ts;
		this.tick = rts;
	}
	draw( ctx ) {
		ctx.beginPath();
		ctx.fillStyle = "white";
		ctx.fillText( this.name, 10, 10 );
		ctx.fillText( this.clock.toFixed(2), 100, 10 );
		ctx.fillText( (this.tick).toFixed(2), 150, 10 );	
	}
}

export default Token;