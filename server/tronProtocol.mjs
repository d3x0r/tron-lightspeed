export const config = (await import( "file://"+process.cwd()+  "/config.jsox" )).default;

import {WS, Protocol} from "sack.vfs/server-protocol"
const pathParts = new URL( import.meta.url ).pathname.split('/');
const thisPath = pathParts.slice( 1, pathParts.length-(1+((process.platform==="win32")?1:0) ) ).join('/');
console.log( pathParts, thisPath );

// not sure how this hooks together yet
import {getUser, enableLogin} from "./login.mjs";

const clientBoards = new Map();

class TronClient extends WS {
	delta = 0;
	tsDelta = 0;
	timeDelta = 0;
	user = null;
	players = []; // all other players related to this player...
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
		this.on( "close", (code, reason)=>{
			
		});

		this.on( "join", (client,msg)=>{
			clientBoards.set( msg.join.uid, client )
			client.players.push( client );
			// echo join(mostly)
			client.send( {op:"join", join:msg.join} );
		} );
		this.on( "key", (client,msg)=>{
			client.user = getUser( msg.key );
			console.log( "Is client client?", client );
			client.send( {op:"user", user:client.user } );
			// allow this user to play... they asked nicely afterall...
			//client.key = msg.key
		} );

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
		msg.user = client.user;
		const msg_ = JSOX.stringify( msg );
		this.player.forEach( p=>p.send( msg_ ) );
	}
	decelerate( client, msg ) {
		msg.timeStamp += client.timeDelta;
		msg.user = client.user;
		const msg_ = JSOX.stringify( msg );
		this.player.forEach( p=>p.send( msg_ ) );
	}
	turn( client, msg ) {
		msg.timeStamp += client.timeDelta;
		msg.user = client.user;
		const msg_ = JSOX.stringify( msg );
		this.player.forEach( p=>p.send( msg_ ) );
	}
	cruise( client, msg ) {
		msg.timeStamp += client.timeDelta;
		msg.user = client.user;
		const msg_ = JSOX.stringify( msg );
		this.player.forEach( p=>p.send( msg_ ) );
	}


	message( connection, message ) {
		
		console.log( "Message from", connection, message );
	}

}

const protocol = new TronProtocol();
