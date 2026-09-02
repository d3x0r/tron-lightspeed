import { Protocol } from "sack.vfs/server-protocol";

const pathParts = new URL( import.meta.url ).pathname.split( "/" );
const thisPath = pathParts.slice( ( process.platform === "win32" ) ? 1 : 0, pathParts.length - 2 ).join( "/" );

class LocalProtocol extends Protocol {
	constructor() {
		super( { port: 8180, npmPath: thisPath, resourcePath: thisPath + "/ui" } );
		this.on( "accept", () => true );
		console.log( "tron-lightspeed local play  http://localhost:8180/" );
		console.log( "serving", thisPath + "/ui" );
	}
}

new LocalProtocol();
