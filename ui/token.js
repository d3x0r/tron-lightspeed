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
	// directions:
	direction = directions.north;
	directionAt = 0;
	board = null;
	constructor( board, x, y ) {
		this.x = x;
		this.y = y;
		this.board = board;
	}
	accelerate( V, A, t )
	{
		// accelerate starts at the beginning of a segment.

		// in feels-like speed
		this.V.x = V.x + A.x*t/2;
		this.V.y = V.y + A.y*t/2;
	}

	moveX( X, V, A, t ) {

		this.X.x = X.x + V.x*t + A.x*t*t/2;
		this.X.y = X.y + V.y*t + A.y*t*t/2;
		this.tick += t;
		this.clock += ( this.gamma = gammaF(this.V) )*t;
	}

	// cruise
	move( ts, delta ){
		const last = this.tail.last;
		last.end = ts;
	}
	turnTo( d, ts ) {
		if( d > 0 ) {
			this.direction = (this.direction + d)%4;
		} else if ( d < 0 ) {
			this.direction = (this.direction + d + 4)%4;
		}
		new Span( this.tail, {X:this.X,V:this.V,A:this.A, direction:this.direction, start:ts, end:ts} );
	}
	accel( n, ts ) {
		this.A.x += n;
		new Span( this.tail, {X:this.X,V:this.V,A:this.A, direction:this.direction, start:ts, end:ts} );
	}
	decel( n, ts ) {
		this.A.x -= n;
		new Span( this.tail, {X:this.X,V:this.V,A:this.A, direction:this.direction, start:ts, end:ts} );
	}
}

export default Token;