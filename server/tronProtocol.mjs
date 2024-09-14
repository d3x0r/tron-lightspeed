export const config = (await import( "file://"+process.cwd()+  "/config.jsox" )).default;

import {WS, Protocol} from "sack.vfs/server-protocol"
const pathParts = new URL( import.meta.url ).pathname.split('/');
const thisPath = pathParts.slice( 1, pathParts.length-(1+((process.platform==="win32")?1:0) ) ).join('/');
console.log( pathParts, thisPath );

// not sure how this hooks together yet
import {enableLogin} from "./login.mjs";

class TronClient extends WS {
	delta = 0;
	tsDelta = 0;
	timeDelta = 0;

	constructor( ws ) {
		super( ws );
	}

	setDelta( delta, tsDelta ) {
		this.delta = delta;
		this.tsDelta = tsDelta;
	}
}

class TronProtocol extends Protocol {
	wsMap = new WeakMap();
	players = [];
	constructor() {
		super( {port:8180, npmPath:thisPath, resourcePath:thisPath+"/ui", WS:TronClient } );

		this.on( "accept", this.accept.bind( this ) )
		this.on( "connect", this.connect.bind( this ) )
		this.on( "tick", this.tick.bind( this ) )
		this.on( "tock", this.tock.bind( this ) )
		this.on( "turn", this.turn.bind( this ) )
		this.on( "accelerate", this.accelerate.bind( this ) )
		this.on( "cruise", this.cruise.bind( this ) )
		this.on( "decelerate", this.decelerate.bind( this ) )

		const app = this.server.app
		enableLogin( this.server, app );

	}

	tick( connection, message ) {
		//console.log( "Tick", message );
		connection.send( {op:"tick", now:Date.now(), pnow:performance.now(), prnow:message.now, prpnow:message.pnow } );
		return true;
	}
	tock( connection, message ) {
		//console.log( "Tock", client, connection, message );
		connection.delta = Date.now() - message.prnow;
		connection.tsDelta = performance.now() - message.prpnow;
		connection.timeDelta = ( message.prpnow + connection.tsDelta/2 ) - message.pnow;
		connection.send( {op:"tock", now:Date.now(), pnow:performance.now(), prnow:message.now, prpnow:message.pnow, timeDelta: connection.timeDelta } );
		console.log( "Tock Delta:", connection.delta, connection.tsDelta, connection.timeDelta );
		return true;
	}
	accept( connection ) {
		return ( connection.connection.headers['Sec-WebSocket-Protocol'] === "tron" );
	}
	connect( connection, ws ) {
		this.wsMap.set( connection, ws );
		this.players.push( connection );
		//console.log( "Connected to", connection, ws );
		//ws.on( "message", this.message.bind( this, connection ) );
	}

	accelerate( client, msg ) {
		msg.timeStamp += client.timeDelta;
		this.player.forEach( p=>p.send( msg ) );
	}
	decelerate( client, msg ) {
		msg.timeStamp += client.timeDelta;
		this.player.forEach( p=>p.send( msg ) );
	}
	turn( client, msg ) {
		msg.timeStamp += client.timeDelta;
		this.player.forEach( p=>p.send( msg ) );
	}
	cruise( client, msg ) {
		msg.timeStamp += client.timeDelta;
		this.player.forEach( p=>p.send( msg ) );
	}


	message( connection, message ) {
		
		console.log( "Message from", connection, message );
	}

}

const protocol = new TronProtocol();
