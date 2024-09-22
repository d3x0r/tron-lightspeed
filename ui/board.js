
const myself = new URL( import.meta.url );
console.log( myself.pathname );
import  {SaltyRNG} from "/node_modules/@d3x0r/srg2/salty_random_generator2.mjs";
import {popups} from "/node_modules/@d3x0r/popups/popups.mjs";
import {gammaFromFL} from "./relativisticMath.js";
import protocol from "./protocol.js";
import {TronProtocol} from "./protocol.js"
import Token from "./token.js"

import {directions,C,CC,boardSize,deltas,colors} from "./constants.js";

import {requestService} from "/node_modules/@d3x0r/user-database-remote/requestService.js"
requestService( "d3x0r.org", "tron-lightspeed", (token)=>{
	console.log( "Complete login to service", token )
	TronProtocol.connect( token )
});

const playerTokens = {}; // playerMap?

const uid = SaltyRNG.Id();
const playerMap = new Map();
let thisUser = null;
let currentBoard = null;

protocol.on( "open", (ws)=>{
	console.log( "New connection to server... (send join game board)")
	
})

protocol.on( "user", (msg)=>{
	thisUser = msg.user;
})

protocol.on( "boards", (ws, data)=>{
	// probably have to pick another board one day... or pick A board.
	console.log( "Got boards:", data );
	// protocol.emit( "join", performance.now(), { boardid: board.uid, uid:uid } );
	//
} );
protocol.on( "firstJoin", () => {
	protocol.emit( "join", performance.now(), { uid:uid } );
} );
protocol.on( "join", (data) => {
	if( !currentBoard ) {
		if( data.join.uid === uid ) {
			currentBoard = new Board(protocol, thisUser );
			playerMap.set( data.join.uid, currentBoard.player );
			window.game.appendChild( currentBoard.canvas );
			currentBoard.draw( performance.now() );
		}else{
			const player = currentBoard.newPlayer( data.user.UID, data.user );
			console.log( "Player joined (self?):", data, uid, player.x, player.y );
			playerMap.set( data.join.uid, player );
		
		}
	}



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
	board.draw( performance.now() );
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


class GameControls {
	
	constructor(){
	}

	static Go( at ) {
		protocol.emit( "go", at, null );
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
	starttime = 0;
	localtime = 0;
	realtime = 0;
	static nextStart = 0;
	static starts = [
		{x:150, y: 500, d:directions.east}
		, {x:850, y: 500, d:directions.west}
		, {x:500, y: 150, d:directions.south}
		, {x:500, y: 850, d:directions.north}
		, {x:250, y: 250, d:directions.east}
		, {x:750, y: 750, d:directions.west}
		,{x:250, y: 750, d:directions.east}
		,{x:750, y: 250, d:directions.west}
		,{x:150, y: 850, d:directions.north}
		,{x:850, y: 150, d:directions.south}
		,{x:150, y: 150, d:directions.south}
		,{x:850, y: 850, d:directions.north}
		,{x:250, y:850, d:directions.north}
		,{x:750, y:150, d:directions.west}
	];

	static nextBot = 0;
	static bots = [
		{x:100, y: 100, d:directions.east}
		, {x:800, y: 100, d:directions.west}
		, {x:100, y: 800, d:directions.south}
		, {x:800, y: 800, d:directions.north}
		, {x:500, y: 500, d:directions.north}
	];


	botMove( ts ) {
		if( !this.starttime ) return;

		for( let bot of this.bots ) {
			const last = bot.tail.last;
			if( ( last.end - ts ) < 0 ) {
				let newDirection = 0;
				if( bot.botLeft ) 
					last =  (last.direction+1)%4
				else
					last =  (last.direction+3)%4
				const nextMove = new Span( this, {X:last.X.e,Vs:last.Ve,A:0,As:0, direction:last, start:last.end } );
				if( this.moves++ < 2 ) {
					nextMove.end = last.end + 1000;
				} else {
					nextMove.end = last.end + 2000;
				}
				nextMove.update();

			}
		}
	}

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
	startButton = new popups.AlertForm( this.canvas, { noClick:true, onClick:()=>{
		this.starttime = performance.now();
		for( let bot of this.bots ) {
			this.bot.tail.last.start = this.starttime;
			this.bot.tail.last.end = this.startTime + 0.5;
		}
		this.startButton.hide();

	}} );
	ctx = this.canvas.getContext( '2d' );
	bitmap = null;
	bm = null;
	tokens = [];
	bots = [];
	priorTimestamp = 0;
	priorTickstamp = 0;
	animating = true;
	//C = 128;
	time = 0;
	constructor(ws, playerInfo) {
		this.startButton.caption = "<Center>GO</center>";
		this.startButton.center();
		this.canvas.width = 1024;
		this.canvas.height = 1024;
		this.bitmap = new ImageData( this.canvas.width, this.canvas.height );
		this.bm = this.bitmap.data;
		new Controls( this );
		this.player = this.newPlayer( SaltyRNG.Id(), playerInfo ); // position assigned 'random'
	}
	
	newPlayer( uid, user ) {
		const sx = Board.starts[Board.nextStart].x;
		const sy = Board.starts[Board.nextStart].y;
		const sd = Board.starts[Board.nextStart].d;
		Board.nextStart = (Board.nextStart+1)%Board.starts.length;

		const token = new Token( this, user, sx, sy, sd );
		token.tail.onstop = (list)=>{
			token.stop();
		}
		token.turnTo( sd );
		this.tokens.push( token );
		playerTokens[uid] = token;
		return token;
	}
	
	removePlayer( uid ) {
		delete playerTokens[uid];
	}

	newDecoration( ) {
		const sx = Board.bots[Board.nextBot].x;
		const sy = Board.bots[Board.nextBot].y;
		const sd = Board.bots[Board.nextBot].d;
		Board.nextBot++;
		const token = new Token( this, {}, sx, sy, sd );
		token.tail.last.Vs = 0.5;
		token.tail.last.Ve = 0.5;
		token.tail.end = this.starttime + 1000;

		this.bots.push( token );
	}

	cruise( timestamp ) {
		const delts = timestamp - this.localtime;
		const delreal = delts/this.frameBaseGamma;
		//tick = this.priorTickstamp + delts/this.frameBaseGamma;
		this.localtime += delts;
		this.realtime = this.realtime + delreal;
		this.player.cruise( this.localtime, this.realtime )
	}
	accelerate( timestamp ) {
		const delts = timestamp - this.localtime;
		const delreal = delts/this.frameBaseGamma;
		//tick = this.priorTickstamp + delts/this.frameBaseGamma;
		this.localtime += delts;
		this.realtime = this.realtime + delreal;
		this.player.accel( 1, this.localtime, this.realtime )
	}
	
	decelerate( timestamp ) {
		const delts = timestamp - this.localtime;
		const delreal = delts/this.frameBaseGamma;
		//tick = this.priorTickstamp + delts/this.frameBaseGamma;
		this.localtime += delts;
		this.realtime = this.realtime + delreal;
		this.player.decel( 1, this.localtime, this.realtime )
	}

	turn( left, timestamp ) {
		// turns are more of a digital thing; you can't turn a little bit.
		// they happen at this isntant.
		const delts = timestamp - this.localtime;
		const delreal = delts/this.frameBaseGamma;
		//tick = this.priorTickstamp + delts/this.frameBaseGamma;
		this.localtime += delts;
		this.realtime = this.realtime + delreal;
		this.player.turn( left, this.localtime );
	}
	

	tick( ts, rts, delts, delreal ) {
		// update timestamp to now.
		this.botMove( ts );
		this.tokens.forEach( token => token.move( ts, rts, delts, delreal  ) );
		let i,j;
		for( i = 0; i < this.tokens.length; i++ ) {
			for( j = i+1; j < this.tokens.length; j++ ) {
				this.tokens[i].collide( this.tokens[j] );
			}
		}
	}


	plot( x, y, color ) {
		const here = (x + y * 1024)*4;
		this.bm[here+0] = this.palette[color][0];
		this.bm[here+1] = this.palette[color][1];
		this.bm[here+2] = this.palette[color][2];
		this.bm[here+3] = this.palette[color][3];
	}
	// cached for re-use
	thisDraw = this.draw.bind( this );
	frameBaseGamma = 1;
	draw(timestamp) {
		let ts = timestamp; // this case the timestamp is in microseconds, and we prefer milliseconds.
		if( !this.realtime ) this.realtime = timestamp-1;
		if( !this.localtime ) this.localtime = timestamp-1;

		let fastest = 0;
		let fastestToken = null;
		this.tokens.forEach( token=>{
			if( Math.abs(token.tail.last.Ve) > fastest ) {
				fastest = Math.abs(token.tail.last.Ve);
				fastestToken = token;
			}
		})
		this.frameBaseGamma = gammaFromFL( fastest );
		if( !this.priorTimestamp ) this.priorTimestamp = timestamp-1;
		const delts = timestamp - this.priorTimestamp;
		const delreal = delts/this.frameBaseGamma;
		ts = this.priorTickstamp + delts/this.frameBaseGamma;
		//console.log( "Frame dilation:", this.frameBaseGamma );
		this.priorTickstamp = ts;
		this.priorTimestamp += delts;
		this.localtime += delts;
		this.realtime += delreal;

		//console.log( "frame gets:", timestamp, ts, performance.now() );
		// update everything with 'move' at(until) this timestamp.
		this.tick( this.localtime, this.realtime, delts, delreal );


		this.ctx.clearRect( 0, 0, 1024, 1024 );
		// initialize background
		this.ctx.fillStyle = "black";
		this.ctx.fillRect( 0, 0, 1024, 1024 );

		/*
		const data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
		this.bitmap = data;
		this.bm = data.data;
		for( let i = 1; i < 500; i++) {
			this.plot( i, i, i%6 );
		}
		this.ctx.putImageData( this.bitmap, 0, 0 );
		*/

		for( let {bot,botid} of this.bots ){
			console.log( "draw bot, botid?", bot, botid );
			// I can always see my own wall anywhere at any time - physics.
			this.ctx.beginPath();

			this.ctx.strokeStyle = Board.palette[botid];
			bot.draw( this.ctx, this.player.tail.last, timestamp );
		}

		let end = {x:0,y:0};
		this.ctx.beginPath();

		this.ctx.strokeStyle = "white";
		for( let token of this.tokens ){
			// I can always see my own wall anywhere at any time - physics.
			if( token == this.player ) {
				// start at the start...
				let span = token.tail.reset( true )
				const start = span.X.s;
				this.ctx.moveTo( start.x, start.y );
				do {
					end = span.X.e;
					this.ctx.lineTo( end.x, end.y );
				} while ( span = token.tail.next() );
				break;
			} else {
				token.draw( this.ctx, this.player.tail.last, timestamp );
				
			}
		}
		this.ctx.stroke();


		for( let token of this.tokens ){
			// I can always see my own wall anywhere at any time - physics.
			if( token == this.player ) {
				continue;
			}

			let span = token.tail.reset( false );
			//span.X-
			do {
				span.drawTo( this.ctx, ts, end );
			} while( span = token.tail.next() );

		}

		for( let token of this.tokens ){
			this.ctx.beginPath();
			this.ctx.strokeStyle = "red";
			this.ctx.arc( token.tail.last.X.e.x, token.tail.last.X.e.y, 5, 0, Math.PI*2 );
			this.ctx.stroke();
		}

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
		//console.log( "Key down", ev.code );
		switch( ev.code ) {
		case "ArrowUp":
		case "KeyW":
			this.forward = true;
			this.board.accelerate(ev.timeStamp);
			break;
		case "ArrowDown":
		case "KeyS":
			this.backward = true;
			this.board.decelerate(ev.timeStamp);
			break;
		case "ArrowLeft":
		case "KeyA":
			if( !this.left ) {
				this.left = true;
				this.board.turn(1,ev.timeStamp);
			}
			break;
		case "ArrowRight":
		case "KeyD":
			if( !this.right ) {
				this.right = true;
				this.board.turn(-1,ev.timeStamp);
			}
			break;
		}
	}
	keyUp( ev ) {
		//console.log( "Key up", ev.code, ev.timeStamp );
		switch( ev.code ) {
		case "ArrowUp":
		case "KeyW":
			this.forward = false;
			if( this.backward ) this.board.decelerate(ev.timeStamp);
			else this.board.cruise(ev.timeStamp);
			break;
		case "ArrowDown":
		case "KeyS":
			this.backward = false;
			if( this.forward ) this.board.accelerate(ev.timestamp);
			else this.board.cruise(ev.timeStamp);
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

