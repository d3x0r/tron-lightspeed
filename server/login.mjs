import {sack} from "sack.vfs" // Id()
export const config = (await import( "file://"+process.cwd()+  "/config.jsox" )).default;
//------------------------
// Login service hook.
import {handleRequest as socketHandleRequest} from "@d3x0r/socket-service";

//const loginCode = sack.HTTPS.get( { port:8089, hostname:"d3x0r.org", path:"serviceLogin.mjs" } );
//  eval( loginCode ); ... (sort-of)
import {UserDbRemote} from "@d3x0r/user-database-remote";
UserDbRemote.import = Import;

// request for user to get unique ID from service.
UserDbRemote.on( "expect", expect );

const connections = new Map();

function Import(a) { return import(a)} 

console.log( "login server await..." );


let  loginServer = await UserDbRemote.open( { towers: config.loginTowers } );
//console.log( "LOGIN?", loginServer );
initServer(loginServer );
console.log( "init server again?" );
function initServer( loginServer ) {
	//console.log( "So login server close I should be able to on?", loginServer );
	//console.log( "loginserver:", loginServer, loginServer&&loginServer.ws&&loginServer.ws.connection );
	config.loginRemote = loginServer.ws.connection.remoteAddress;
	config.loginRemotePort = loginServer.ws.connection.remotePort;
	loginServer.on( "close", ()=>{
		console.log( "Top level close on loginserver (result of userdbremote.open)" );
		
		loginServer = null;
		setTimeout( async ()=>{
				console.log( "This should have been after 5 seconds..." );
				//loginServer = await UserDbRemote.open( { towers: config.loginTowers } );
				//initServer( loginServer );
			}, 5000 );
	} );

}


function expect( msg ) {
	console.log( "Told to expect a user: does this result with my own unique ID?", msg );

	const id = sack.Id();
	const user = msg;
	connections.set( id, user );

	
	// lookup my own user ? Prepare with right object?
	// connections.set( msg.something, msg ) ;	
	return id;
}

export function enableLogin( server, app ) {
	server.addHandler( socketHandleRequest );
	// handle /internal/loginServer request
	app.get( /\/internal\//, (req,res)=>{
		const split = req.url.split( "/" );
		console.log( "Resolve internal request:", split );
		switch( split[2] ) {
		case "loginServer":
			res.writeHead( 200, {'Content-Type': "text/javascript" } );
			res.end( "export default "+JSON.stringify( {loginRemote:config.loginRemote, loginRemotePort:config.loginRemotePort} ) );
			return true;
		}
	} );
}