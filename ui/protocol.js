import {JSOX} from "/node_modules/jsox/lib/jsox.mjs"
import {Protocol} from "/node_modules/sack.vfs/apps/http-ws/client-protocol.js"

export class TronProtocol extends Protocol {
	tsDelta = 0;
	delta = 0;
	gTimeDelta = 0;
	timeDelta = 0; // this is the time delta the server reported to us.
	players = [];
	key = null;

	constructor() {
		// otherwise this protocols supports accelerate, decelerate, cruise, turn (used by application importing this.)
		// this application will use .emit() to send messages to the server.
		// tick, tock (initial time sync)
		// and functional 'open' and 'close' events
		super( /*"tron"*/ );
		this.on( "open", this.#open.bind( this ) )
		this.on( "tick", this.tick.bind( this ) );
		this.on( "tock", this.tock.bind( this ) );
	}

	static connect( key ) {
		protocol.key = key;	
		Protocol.connect( "tron", protocol );
	}

	#open() {
		console.log( "Connected..." );
		if( this.key )
			this.send( JSOX.stringify( {op:"key", key:this.key} ) );

		this.send( JSOX.stringify( {op:"tick", now:Date.now(), pnow:performance.now() }) )
	}

	

	tick( message ) {
		console.log( "Tick", message );

		this.delta = Date.now() - message.prnow;
		this.tsDelta = performance.now() - message.prpnow;
		this.timeDelta = ( message.prpnow + this.tsDelta/2 ) - message.pnow;
		console.log( "Tick Delta:", this.delta, this.tsDelta, this.timeDelta );
		this.send( JSOX.stringify( {op:"tock", now:Date.now(), pnow:performance.now(), prnow:message.now, prpnow:message.pnow }) )
		return true
	}
	tock( message ) {
		console.log( "Tock", message );
		this.gTimeDelta = message.timeDelta;
		this.on( "firstJoin", true );
		//this.send( JSOX.stringify( {op:"tock", now:Date.now(), pnow:performance.now(), prnow:message.now, prpnow:message.pnow }) )
		return true
	}

	emit( event, timestamp, data ) {
		const msg = JSOX.stringify( {op:event, ts:timestamp, [event]:data} );
		this.send( msg );
	}

}

const protocol = new TronProtocol();
export default protocol;