import {Ref} from './ref.js';
import {directions} from "./constants.js"
import {C,CC,boardSize} from "./constants.js"


function gammaFromFL(V) {
	return Math.sqrt( CC/(V*V+CC))
}

function gamma(V) {
	return Math.sqrt( C*C-Math.sqrt(V.x*V.x+V.y*V.y))/C;
}

function gammaF(V) {
	//\frac{\sqrt{CC-\left(\frac{xC}{\sqrt{CC+xx}}\right)^{2}}}{C}
	return C/Math.sqrt(C*C+Math.sqrt(V.x*V.x+V.y*V.y));
	return Math.sqrt( C*C-Math.sqrt(V.x*V.x+V.y*V.y))/C;
}




export class Span extends Ref {
	start = 0;
	end = 0;
	tickDel = 0; // local clock delta tick
    //tick = 0;
	X = { s:{x:0,y:0},e:{x:0,y:0} };
	Vs = 0;
	Ve = 0;
	VsR = 0;
	VeR = 0;
	A = 0;
	As = 0;
	Ae = 0;
	direction = directions.north;
	inList = null;
	
	get posStart() {
		return {x:this.X.s.x, y:this.X.s.y};
	}

	update() {

		const gs = gammaFromFL( this.Vs );
		const perSec = (this.end-this.start)/(gs*1000);

		this.Ae = this.A*perSec;
		this.Ve = this.Vs + this.Ae;

		const ge = gammaFromFL( this.Ve );

		// compute actual ending acelerations and velocities and positions...
		this.VsR = Span.getReal( this.Vs );
		this.VeR = Span.getReal( this.Ve );

		const avgV = Span.Vintegral(this.Vs, this.A, perSec);
		// avgV is bad.
		this.tickDel = gamma( avgV ) * perSec;
		//const tickDele = gamma( this.VeR );
		//console.log( "update", avgV, perSec, this.Vs, this.Ve );
		switch( this.direction ) {
		case 0:
			this.X.e.y = this.X.s.y - avgV*perSec;
			break;
		case 1:
			this.X.e.x = this.X.s.x - avgV*perSec;
			break;
		case 2:
			this.X.e.y = this.X.s.y + avgV*perSec;
			break;
		case 3:
			this.X.e.x = this.X.s.x + avgV*perSec;
			break;
		}
		if( this.X.e.x < 0 ) {
			this.X.e.x = 0;
			this.inList.onstop( );
		}
		if( this.X.e.y < 0 ) {
			this.X.e.y = 0;
			this.inList.onstop( );
		}
		if( this.X.e.x > boardSize ) {
			this.X.e.x = boardSize;
			this.inList.onstop();
		}
		if( this.X.e.y > boardSize ) {
			this.X.e.y = boardSize;
			this.inList.onstop( );
		}

		let cur = this.inList.reset( true );
		if( this.direction == 0 || this.direction == 2 ) {
			do {
				if( cur.direction ==1 || cur.direction == 3) {
					//console.log( "Test segment collision (a<B*b>A  B=A)", cur.X.s.x, this.X.e.x, cur.X.e.x, this.X.s.x );
					if( ( cur.X.s.x < this.X.e.x && cur.X.e.x > this.X.s.x )
						||( cur.X.s.x > this.X.e.x && cur.X.e.x < this.X.s.x ) ) {
						//console.log( "yes.... and (a<B*b>A  B=A)", this.X.s.y, cur.X.s.y,this.X.e.y, cur.X.e.y );
						if ( ( this.X.s.y < cur.X.s.y && this.X.e.y > cur.X.e.y )
							|| ( this.X.s.y > cur.X.s.y && this.X.e.y < cur.X.e.y )) {
							// collision
							console.log( "STOP!" );
							this.inList.onstop( );
						}
					}
				}
			}while( cur = this.inList.next() );
		}
		if( this.direction == 1 || this.direction == 3 ) {
			do {
				if( cur.direction ==0 || cur.direction == 2) {
					//console.log( "Test segment collision (a<B*b>A  B=A)", cur.X.s.y, this.X.e.y, cur.X.e.y, this.X.s.y );
					if( ( cur.X.s.y < this.X.e.y && cur.X.e.y > this.X.s.y ) 
						||( cur.X.e.y < this.X.e.y && cur.X.s.y > this.X.s.y ) ) {
						//console.log( "yes.... and (a<B*b>A  B=A)", this.X.s.x, cur.X.s.x,this.X.e.x, cur.X.e.x );
						if( ( this.X.s.x < cur.X.s.x && this.X.e.x > cur.X.e.x )
							|| ( this.X.s.x > cur.X.s.x && this.X.e.x < cur.X.e.x ) ) {
							// collision
							this.inList.onstop( );
						}
					}
				}
			}while( cur = this.inList.next() );
		}
		return ge;
	}

	
	static Vintegral( V, A, T ) {
		//\frac{C}{0.5}\sqrt{\left(0.5T+x\right)^{2}+C^{2}}-\frac{C}{0.5}
		if( A ) 
			return C/A*(Math.sqrt( (A*T + V)*(A*T + V) + C*C ) - 1);
		return V;

		return C * Math.sqrt( C*C+V*V );
	}
	static getReal( V ) {
		// V is 0 to infinity, and returns is real speed...
		// time dilation is Math.sqrt( C*C-V*V)/C
		// there result of this + A and getFeel = this+A

//1/2 sqrt(C^2/(C^2 + V^2)) sqrt(C^2 + V^2) (-log(1 - V/sqrt(C^2 + V^2)) + log(1 + V/sqrt(C^2 + V^2)))

		// integral over dv = // C * Math.sqrt( CC+V*V ) + c
	
		return V*C/Math.sqrt( C*C + V*V );
	}

	get posEnd() {
		this.update();
		return this.X.e;
	}

	times(from) {

		return {start:this.start,end:this.end}
	}
	times(from) {

		return {start:this.tick,end:this.tick}
	}

	until( time ) {
		const del = (time-this.start)/(this.end-this.start);
		if( del > 1 ) {
			console.log( "time isn't actually in the span" );
			return { x: this.X.s.x + (this.X.e.x-this.X.s.x), y: this.X.s.y + (this.X.e.y-this.X.s.y) };
		} else if( del < 0 ) {
			return { x: this.X.s.x, y: this.X.s.y };
		}
		return { x: this.X.s.x + (this.X.e.x-this.X.s.x)*del, y: this.X.s.y + (this.X.e.y-this.X.s.y)*del };
		// can compute delta time by position - depends on which way the time is... 
		// this is only an approximation.
	}

	constructor( list, opts ) {
		super();
		this.start = opts.start;
		this.end = opts.start;
		this.X.s.x =this.X.e.x = opts.X.x;
		this.X.s.y =this.X.e.y = opts.X.y;
		this.Vs = opts.Vs;
		this.A = opts.A;
		this.As = opts.As;
		this.direction = opts.direction;
		//this.X.e.x = opts.X.x;
		//this.X.e.y = opts.X.y;
		//this.
		//this.tick = list.last.tick;// + gamma(opts.V)*(this.start-this.end)
		this.inList = list;
		list.add( this );
	}
	end( opts ) {

	}
	link( into, field ) {
		console.log( "linking(dead code right?)", into, field );
		this.field = field;
		this.object = into;
		into = this;
	}

	// returns the status if the next span might be visible
	// else returns next span won't be visible
	
	drawTo( ctx, at, from ) {
		const distx = (this.X.s.x - from.x);
		const disty = (this.X.s.y - from.y);
		const distxe = (this.X.e.x - from.x);
		const distye = (this.X.e.y - from.y);
		// usually this additional length will put the time after 'at'
		// there may be a time in the middle of the wall that is before either end, and is close enough to now to be seen.

		const dist = Math.sqrt( (distx*distx) + (disty*disty) )/C;
		const diste = Math.sqrt( (distxe*distxe) + (distye*distye) )/C;
		if( (this.start +dist) > at ) {
			if( (this.start +diste) > at ) {
				return false; // haven't started yet.
			} else {
				// starts being visible from the end, until the start which is further away
				// diste < at
				const del = ( at - diste )/ (dist - diste) // this is the time between the two points.
				ctx.moveTo( this.X.e.x, this.X.e.y );
				ctx.lineTo( this.X.e.x - (this.X.s.x-this.X.e.x)*del, this.X.e.y - (this.X.s.y-this.X.e.y)*del );
				//const this.start + (dist+diste)/2- at
				//const pastStart = (this.start+dist ) - at;
				return false;
			}
		} else {
			// start happened before now
			if( (this.start +diste) > at ) {
				// end happened after now
				return false;
			} else {
				ctx.lineTo( this.X.e.x, this.X.e.y );
				return true;
			}
		}
		if( this.start > at ) return;
		if( this.end < at ) {

		}

	}
}

