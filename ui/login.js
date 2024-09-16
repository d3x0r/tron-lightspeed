import {TronProtocol} from "./protocol.js"
import {popups} from "/node_modules/@d3x0r/popups/popups.mjs"
const l = {
	login : null,
};

//import {connection,Alert,openSocket} from "/login/webSocketClient.js";
import loginServer from "/internal/loginServer";
const loginInterface = ( (location.protocol+"//"+loginServer.loginRemote+":"+loginServer.loginRemotePort) || "https://d3x0r.org:8089" ) + "/login/webSocketClient.js";

let n = 0;
let loginDone = false;

async function firstConnect() {
	return await import( loginInterface+"?"+n++ ).then( (module)=>{
		//console.log("Thing:", module );
		beginLogin( module.openSocket, module.connection );
		return module;
	} ).catch( (err)=>{
		//console.log( "err:", err );
		return new Promise( (res,rej)=>{
			setTimeout( ()=>firstConnect().then( res ), 5000 );
		} );
	} );
}
// gets login interface from login server
// blocks until a connection happens - should be a temporary thing that it blocks...
const wsc = await firstConnect();

//import {connection,Alert,openSocket} from "/login/webSocketClient.js";


function beginLogin( openSocket, connection ) {
	// uses socket-service websocket connection to login to the server.
	return openSocket().then( (socket)=>{
		//console.log( "Open socket finally happened?", socket );
		socket.setUiLoader();
		connection.on( "close", (code, reason)=>{
			if( !l.login ) {
				console.log( "Closed login before login; refresh page" );
				location.href=location.href;
			} else {
				console.log( "Let GC have this socket, auth is already done" );
			}
		} ) 
		connection.loginForm = popups.makeLoginForm( (token)=>{
			if( !token ) {
				console.log( "login failed, or service lookup failed, or request to service instance was disconnected...")
				return;
			}
			let tries = 0;
				function retry() {
					tries++;
					if( tries > 3 ){ console.log( "stop trying?" );return;}
					console.log( "login completed...", token.name, token.svc&&token.svc.key );
					connection.request( "d3x0r.org", "tron-lightspeed" ).then( (token)=>{
						;
						console.log( "module request:", token );
						l.login = token; // this is 'connection' also.
						connection.loginForm.hide();
						socket.close( 1000, "Thank You."); // close the login socket.
						if( token.svc ) {
							TronProtocol.connect( token.svc.key );
						}else {
							console.log( "Service wasn't given to us?")
							retry();
						}
							// failed to get service, try again.
					} );
				}
				retry();
			}
			
			, {wsLoginClient:connection ,
				useForm: (location.protocol+"//"+loginServer.loginRemote+":"+loginServer.loginRemotePort) + "/login/loginForm.html",
				parent: document.getElementById( "game" )
				
			} );
	

		connection.loginForm.show();
		connection.loginForm.center();
		return socket;
	} );

}
