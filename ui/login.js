import {TronProtocol} from "./protocol.js"

const l = {
	login : null,
};

//import {connection,Alert,openSocket} from "/login/webSocketClient.js";
import loginServer from "/internal/loginServer";
const loginInterface = ( ("https://"+loginServer.loginRemote+":"+loginServer.loginRemotePort) || "https://d3x0r.org:8089" ) + "/login/webSocketClient.js";

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

	let login = openSocket().then( (socket)=>{
		console.log( "Open socket finally happened?", socket );
			//login = socket;
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
				console.log( "login completed...", token );
        		connection.request( "d3x0r.org", "tron-lightspeed" ).then( (token)=>{
					;
					console.log( "flatland request:", token );
				   l.login = token; // this is 'connection' also.
				   connection.loginForm.hide();
					socket.close( 1000, "Thank You.");
					TronProtocol.connect( token.svc.key );
				} );
			}
			, {wsLoginClient:connection ,
				useForm: ("http://"+loginServer.loginRemote+":"+loginServer.loginRemotePort) + "/login/loginForm.html",
				parent: app
			} );

		connection.loginForm.show();
		return socket;
	} );

}
