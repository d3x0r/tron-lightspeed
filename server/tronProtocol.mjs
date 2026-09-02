export const config = (await import( "file://"+process.cwd()+  "/config.jsox" )).default;

import {WS, Protocol} from "sack.vfs/server-protocol"
const pathParts = new URL( import.meta.url ).pathname.split('/');
const thisPath = pathParts.slice( (process.platform==="win32")?1:0, pathParts.length-2 ).join('/');

let getUser = (_key) => null;
let enableLogin = null;
try {
	const loginMod = await import("@d3x0r/user-database-remote/enableLogin.mjs");
	getUser = loginMod.getUser;
	enableLogin = loginMod.enableLogin;
} catch (e) {
	console.log("user-database-remote not available; local play only:", e.message);
}

const clientBoards = new Map();

class TronClient extends WS {
	delta = 0;
	tsDelta = 0;
	timeDelta = 0;
	user = null;
	players = [];
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
			client.send( {op:"join", join:msg.join} );
		} );
		this.on( "key", (client,msg)=>{
			client.user = getUser( msg.key && msg.key.svc && msg.key.svc.key ? msg.key.svc.key[0] : null );
			console.log( "Is client client?", msg.key, client );
			client.send( {op:"user", user:client.user } );
		} );

		const app = this.server.app
		if( enableLogin ) {
			try { enableLogin( this.server, app ); }
			catch (e) { console.log("enableLogin skipped:", e.message); }
		}
		console.log("tron-lightspeed  http://localhost:8180/");
	}

	tick( connection, message ) {
		connection.send( {op:"tick", now:Date.now(), pnow:performance.now(), prnow:message.now, prpnow:message.pnow } );
		return true;
	}
	tock( connection, message ) {
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
	}

	accelerate( client, msg ) {
		msg.timeStamp += client.timeDelta;
		msg.user = client.user;
		const msg_ = JSOX.stringify( msg );
		this.players.forEach( p=>p.send( msg_ ) );
	}
	decelerate( client, msg ) {
		msg.timeStamp += client.timeDelta;
		msg.user = client.user;
		const msg_ = JSOX.stringify( msg );
		this.players.forEach( p=>p.send( msg_ ) );
	}
	turn( client, msg ) {
		msg.timeStamp += client.timeDelta;
		msg.user = client.user;
		const msg_ = JSOX.stringify( msg );
		this.players.forEach( p=>p.send( msg_ ) );
	}
	cruise( client, msg ) {
		msg.timeStamp += client.timeDelta;
		msg.user = client.user;
		const msg_ = JSOX.stringify( msg );
		this.players.forEach( p=>p.send( msg_ ) );
	}

	message( connection, message ) {
		console.log( "Message from", connection, message );
	}

}

const protocol = new TronProtocol();
