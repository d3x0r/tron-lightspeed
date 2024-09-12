
const myself = new URL( import.meta.url );
console.log( myself.pathname );
import  {SaltyRNG} from "/node_modules/@d3x0r/srg2/salty_random_generator2.mjs";
import protocol from "./protocol.js";

import from "./login.js"

const uid = new SaltyRNG.Id();
const playerMap = new Map();
protocol.send( {op:"join", uid:uid } );

protocol.on( "join", (ws, data) => {
	const player = board.newPlayer( data.uid, data.x, data.y );
	playerMap.set( data.uid, player );
} );

protocol.on( "part", (ws, data) => {
	return board.removePlayer( data.uid );
} );
protocol.on( "accelerate", (ws,msg)=>{
	const player = playerMap.get( msg.uid );
	msg.timeStamp += protocol.gTimeDelta; // translate to my local time
	player.accelerate( msg.timeStamp ); 
});
protocol.on( "decelerate", (ws,msg)=>{
	const player = playerMap.get( msg.uid );
	msg.timeStamp += protocol.gTimeDelta; // translate to my local time
	player.decelerate( msg.timeStamp ); 
});
protocol.on( "cruise", (ws,msg)=>{
	const player = playerMap.get( msg.uid );
	msg.timeStamp += protocol.gTimeDelta; // translate to my local time
	player.cruise( msg.timeStamp ); 
});
protocol.on( "turn", (ws,msg)=>{
	const player = playerMap.get( msg.uid );
	msg.timeStamp += protocol.gTimeDelta; // translate to my local time
	player.turn( msg.left, msg.timeStamp ); 
});

protocol.on( "go", (ws,msg)=>{
	// translate global time to my local time
	board.start = msg.timeStamp + protocol.gTimeDelta;
	// make sure the game runs?
	board.draw();
});

/*

V_{real}=\frac{xC}{\sqrt{\left(CC+xx\right)}}


function getReal( V ) {
	// V is 0 to infinity, and returns is real speed...
	// time dilation is Math.sqrt( C*C-V*V)/C
	// there result of this + A and getFeel = this+A
	return V*C/Math.sqrt( C*C + V*V );
}

function getFeel( V ) {
	// V is 0 to C, and returns is effective...
	// time dilation is a factor of the feeling.
	return V*C/Math.sqrt( C*C - V*V );
}

function accelerate( V, A, t )
{
	// in feels-like speed
	V = V + A*t/2;
}

function move( X, V, A, t ) {
	X = X + V*t + A*t*t/2;
}



*/

const C = 128;
const boardSize = 960;
const colors = [
	
]
const directions = {
	north:0,
	west:1,
	south:2,
	east:4,
};

Object.freeze( directions );
Object.seal( directions );

function gamma(V) {
	return Math.sqrt( C*C-Math.sqrt(V.x*V.x+V.y*V.y))/C;
}

function gammaF(V) {
	//\frac{\sqrt{CC-\left(\frac{xC}{\sqrt{CC+xx}}\right)^{2}}}{C}
	return C/Math.sqrt(CC+Math.sqrt(V.x*V.x+V.y*V.y));
	return Math.sqrt( C*C-Math.sqrt(V.x*V.x+V.y*V.y))/C;
}

class Ref {
	next= null;
	object=null;
	field=null;
	set( value ) {
		this.next = this.object[this.field];
		this.object[this.field] = value;
	}

}

class SpanList {
	first = null;
	last = null;
	add( span ) {
		if( !this.first ) {
			this.first = span;
			span.next = null;
			span.object = this;
			span.field = "first";
			this.last = span;
			return;
		} else {
			this.last.next = span;
			span.next = null;
			span.object = this.last;
			span.field = "next";
			this.last = span;
		}
	}
}

class Span extends Ref {
	start = 0;
	end = 0;
	X = { s:{x:0,y:0},e:{x:0,y:0} };
	inList = null;

	times(from) {

		return {start:this.start,end:this.end}
	}

	until( time ) {
		const del = (time-this.start)/(this.end-this.start);
		if( del > 1 || del < 0 ) {
			console.log( "time isn't actually in the span" );
		}
		return { x: X.s.x + (X.e.x-this.X.s.x)*del, y: X.s.y + (X.e.y-this.X.s.y)*del };
		// can compute delta time by position - depends on which way the time is... 
		// this is only an approximation.
	}

	constructor( list, opts ) {
		super();
		this.start = opts.start;
		this.end = opts.end;
		this.X.s.x = opts.X.x;
		this.X.s.y = opts.X.y;
		//this.X.e.x = opts.X.x;
		//this.X.e.y = opts.X.y;
		this.tick = this.tick + gamma(opts.V)*(this.start-this.end)
		list.add( this );
	}
	end( opts ) {

	}
	link( into, field ) {
		this.field = field;
		this.object = into;
		into = this;
	}
}

class Token {
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
	board = null;
	constructor( board, x, y ) {
		this.x = x;
		this.y = y;
		this.board = board;
	}
	accelerate( V, A, t )
	{
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

	move( delta ){
		const s = new Span( this.tail, {X:this.X,V:this.V,A:this.A, start:this.tick, end:this.tick+delta} );
		s.until( delta );

		this.moveX( this.X, this.V, this.A, delta );

		//board.move( this.x, this.y, this.direction, this.spd, delta );
	}
	turnTo( d ) {
		this.direction = d;
	}
	accel( n ) {
		
	}
}

class Wall {
	x = 0;
	y = 0;
	color = 0;	
	direction = 0;
	placed = 0; // time when wall was placed
	constructor( x, y, color, direction ) {
		this.x = x;
		this.y = y;
		this.color = color;
		this.direction = direction;
	}
}

class GameControls {
	
	constructor(){
	}

	static Go( at ) {
		protocol.emit( "go", start:at );
	}
}


class Board {
	// 0000_0000b = empty
	// 0000_0001b = center-north wall
	// 0000_0010b = center-west wall
	// 0000_0100b = center-south wall
	// 0000_1000b = center-east wall
	// 1111_xxxxb = wall color
	// if cell is not empty, then a collision happens.
	map = new Uint8Array( boardSize*boardSize );
	time = new Float32Array( boardSize*boardSize );
	palette = [
		[0xFF,0x00,0x00,0xFF],
		[0x00,0xFF,0x00,0xFF],
		[0x00,0x00,0xFF,0xFF],
		[0xFF,0xFF,0x00,0xFF],
		[0xFF,0x00,0xFF,0xFF],
		[0x00,0xFF,0xFF,0xFF],
		[0x00,0x00,0x00,0xFF],
		[0xFF,0xFF,0xFF,0xFF],		
	]
	start = 0; // time of start, if 0, then game hasn't started.
	canvas = window.gameCanvas;
	ctx = this.canvas.getContext( '2d' );
	bitmap = null;
	bm = null;
	tokens = [];
	priorTimestamp = 0;
	animating = true;
	//C = 128;
	time = 0;
	constructor() {
		this.canvas.width = 1024;
		this.canvas.height = 1024;
		this.bitmap = new ImageData( this.canvas.width, this.canvas.height );
		this.bm = this.bitmap.data;
		new Controls( this );
		this.player = this.newPlayer( SaltyRNG.Id(), 500, 50 );
	}
	
	newPlayer( uid, x, y ) {
		const token = new Token( this, x, y );
		this.tokens.push( token );
		return token;
	}
	
	removePlayer( x, y ) {
		const token = new Token( this, x, y );
		this.tokens.push( token );
		return token;
	}
	cruise( timestamp ) {

		if( !this.priorTimestamp ) {
			this.priorTimestamp = timestamp;
			return;
		}
		const delta = timestamp - this.priorTimestamp;
		this.priorTimestamp = timestamp;
		this.player.token.cruise( timestamp )
	}
	accelerate( timestamp ) {

		if( !this.priorTimestamp ) {
			this.priorTimestamp = timestamp;
			return;
		}
		const delta = timestamp - this.priorTimestamp;
		this.priorTimestamp = timestamp;
		this.player.token.accelerate( timestamp )
	}
	
	decelerate( timestamp ) {

		if( !this.priorTimestamp ) {
			this.priorTimestamp = timestamp;
			return;
		}
		const delta = timestamp - this.priorTimestamp;
		this.priorTimestamp = timestamp;
		this.player.token.accelerate( timestamp )
	}

	turn( left, timestamp ) {
		// turns are more of a digital thing; you can't turn a little bit.
		// they happen at this isntant.
		if( !this.priorTimestamp ) {
			this.priorTimestamp = timestamp;
			return;
		}
		const delta = timestamp - this.priorTimestamp;
		this.priorTimestamp = timestamp;
		this.player.token.turn( left, timestamp )
	}
	

	tick( delta ) {
		this.time += delta;
		this.tokens.forEach( token => token.move( delta ) );
		return this.time;
	}


	plot( x, y, color ) {
		const here = (x + y * 1024)*4;
		this.bm[here+0] = this.palette[color][0];
		this.bm[here+1] = this.palette[color][1];
		this.bm[here+2] = this.palette[color][2];
		this.bm[here+3] = this.palette[color][3];
	}

	thisDraw = this.draw.bind( this );
	draw(timseStamp) {

		console.log( "frame gets:", timseStamp, timseStamp/1000, performance.now() );
		this.tick( timseStamp/1000  );
		this.ctx.clearRect( 0, 0, 1024, 1024 );
		// initialize background
		this.ctx.stokeStyle = "black";
		this.ctx.fillRect( 0, 0, 1024, 1024 );

		const data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
		this.bitmap = data;
		this.bm = data.data;
		for( let i = 1; i < 500; i++) {
			this.plot( i, i, i%6 );
		}

		this.ctx.putImageData( this.bitmap, 0, 0 );
		if( this.animating ) // allow pause(someday)
			requestAnimationFrame( this.thisDraw );
	}

	move( fromX, fromY, d, spd, delta ) {



		const pixelTick = 1;// how much time ticks to move 1 pixel
		let here = fromX + fromY * boardSize;
		const hereEven = here >> 4;
		const hereOdd = here & 0x0F
		do {
			switch( d ){
			case directions.north:
				this.map[here] |= 0b0000_0001 | (color<<4);
				fromY--;
				break;
			case directions.east:
				this.map[here] |= 0b0000_0001 | (color<<4);
				fromX++;
				break;
			case directions.south:
				if( fromX & 1 ) {
					this.map[here] |= 0b0001_0000; 
				}else {
					this.map[here] |= 0b0000_0001;
				}
				fromY++;
				break;
			case directions.west:
				if( fromX & 1 ) {
					this.map[here] |= 0b0001_0000; 
				}else {
					this.map[here] |= 0b0000_0001;
				}
				fromX--;
				break;
			}

			if( fromY < 0 ) {
				return {boom:true, x:fromX, y:fromY};
			}
			if( fromX < 0 ) {
				return {boom:true, x:fromX, y:fromY};
			}
			if( fromY >= boardSize ) {
				return {boom:true, x:fromX, y:fromY};
			}
			if( fromX >= boardSize ) {
				return {boom:true, x:fromX, y:fromY};
			}
			here = fromX>>1 + fromY * 8192;
			const hereBits = this.map[here];
			if( fromX & 1 ) {
				if( hereBits & 0b0000_1111)
					return {boom:true, x:fromX, y:fromY};
			}
			else {
				if( hereBits & 0b1111_0000)
					return {boom:true, x:fromX, y:fromY};
			}

			switch( d ){
				case directions.north:
					this.map[here] |= 0b0000_0100 | (color<<4);
					fromY--;
					break;
				case directions.east:
					this.map[here] |= 0b0000_1000 | (color<<4);
					fromX++;
					break;
				case directions.south:
					this.map[here] |= 0b0000_0001; 
					fromY++;
					break;
				case directions.west:
					this.map[here] |= 0b0000_0010;
					fromX--;
					break;
				}
	

		}
		while( delta > 0 );
	}
		
}

class Controls {
	board = null;
	left=false;
	right=false;
	forward=false;
	backward = false;
	constructor(board) {
		this.board = board;
		window.addEventListener( "keydown", this.keyDown.bind( this ) );
		window.addEventListener( "keyup", this.keyUp.bind( this ) );
	}

	keyDown( ev ) {
		console.log( "Key down", ev.code );
		switch( ev.code ) {
		case "ArrowUp":
		case "KeyW":
			this.forward = true;
			this.board.accelerate(ev.timestamp);
			break;
		case "ArrowDown":
		case "KeyS":
			this.backward = true;
			this.board.decelerate(ev.timestamp);
			break;
		case "ArrowLeft":
		case "KeyA":
			if( !this.left ) {
				this.left = true;
				this.board.turn(1,ev.timestamp);
			}
			break;
		case "ArrowRight":
		case "KeyD":
			if( !this.right ) {
				this.right = true;
				this.board.turn(-1,ev.timestamp);
			}
			break;
		}
	}
	keyUp( ev ) {
		console.log( "Key up", ev.code, ev.timeStamp );
		switch( ev.code ) {
		case "ArrowUp":
		case "KeyW":
			this.forward = false;
			if( this.backward ) this.board.decelerate(ev.timeStamp);
			else this.board.cruise(ev.timestamp);
			break;
		case "ArrowDown":
		case "KeyS":
			this.backward = false;
			if( this.forward ) this.board.accelerate(ev.timestamp);
			else this.board.cruise(ev.timestamp);
			break;
		case "ArrowLeft":
		case "KeyA":
			this.left = false;
			break;
		case "ArrowRight":
		case "KeyD":
			this.right = false;
			break;
		}
	}
}

const board = new Board();
window.game.appendChild( board.canvas );
board.draw();