//
// Server related tasks



// Dependencies
const http          = require('http');
const https         = require('https');
const url           = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs            = require('fs');
const config        = require('../config');
const handlers      = require('./handlers.js');
const helpers       = require('./helpers.js');
const path          = require('path');
const util          = require('util');

const debug = util.debuglog('workers');


// instantiate the server module object
const server = {};


// Instantiating the HTTP server
server.httpServer = http.createServer( (req, res) =>{
	server.unifiedServer(req, res);
} );


// Instantiating the HTTPS server
server.httpsServerOptions = {
	'key' : fs.readFileSync(path.join(__dirname,'../ssl/key.pem')),
	'cert': fs.readFileSync(path.join(__dirname,'../ssl/cert.pem')),
};

server.httpsServer = https.createServer(server.httpsServerOptions,(req, res) =>{
	server.unifiedServer(req, res);
} );

server.processHandlerResonse = function(res, method, trimmedPath, statusCode, payload, contentType){
	// use the callback defined by the handler or default to 200
	statusCode = typeof(statusCode) == 'number' ? statusCode : 200;


	// determing the contentType and fallback to JSON
	contentType = typeof(contentType) == 'string' ? contentType : 'json';

	//return the response parts that are content-specific
	let payloadString = '';
	if(contentType == 'json'){
		res.setHeader('Content-Type','application/json');
		payload = typeof(payload) == 'object' ? payload : {};
		payloadString = JSON.stringify(payload);
	}
	if(contentType == 'html'){
		res.setHeader('Content-Type', 'text/html');
		payloadString = typeof(payload) == 'string' ? payload : '';
	}
	if(contentType == 'favicon'){
		res.setHeader('Content-Type', 'image/x-icon');
		payloadString = typeof(payload) !== 'undefined' ? payload : '';
	}
	if(contentType == 'css'){
		res.setHeader('Content-Type', 'text/css');
		payloadString = typeof(payload) !== 'undefined' ? payload : '';
	}
	if(contentType == 'png'){
		res.setHeader('Content-Type', 'image/png');
		payloadString = typeof(payload) !== 'undefined' ? payload : '';
	}
	if(contentType == 'jpg'){
		res.setHeader('Content-Type', 'image/jpeg');
		payloadString = typeof(payload) !== 'undefined' ? payload : '';
	}
	if(contentType == 'plain'){
		res.setHeader('Content-Type', 'text/plain');
		payloadString = typeof(payload) !== 'undefined' ? payload : '';
	}

	//return the response parts common to all content types
	res.writeHead(statusCode);
	res.end(payloadString);

	//log what path was asked for
	const colorCode = statusCode === 200 ? "'\x1b[32m" : "'\x1b[31m"
	debug(colorCode,'Returning this response',statusCode,payloadString,"'\x1b[0m");

}

// all the server logic for both the http and https server
server.unifiedServer = (req, res) =>{

	//get the url and parse it
	const parsedURL = url.parse(req.url, true);

	//get the path from the url
	const path = parsedURL.pathname;
	const trimmedPath = path.replace(/^\/+|\/+$/g,'');

	// Get Query String as an object
	const queryStringObject = parsedURL.query;

	// Get the HTTP method
	const method = req.method.toLowerCase();

	// Get the headers as an object
	const headers = req.headers;

	// Get payload if there is any
	const decoder = new StringDecoder('utf-8');
	let buffer = '';
	req.on('data',(data)=>{
		buffer += decoder.write(data);
	})
	req.on('end',()=>{
		buffer += decoder.end();
		//request has ended Now do things.

		// Choose the handler this request should go to
		// If one is not found, use the notFound handler
		let chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound
		console.log(chosenHandler);

		// If the request is within the public directory use the  public handler
		chosenHandler = trimmedPath.indexOf('public/',)>-1 ? server.router.public : chosenHandler;

		//construct data object to send to handler
		const data = {
			'trimmedPath'      : trimmedPath,
			'queryStringObject': queryStringObject,
			'method'           : method,
			'headers'          : headers,
			'payload'          : helpers.parseJsonToObject(buffer),
		}

		// route request to hander specified in the router
		try{
			chosenHandler(data,(statusCode,payload,contentType)=>{
				//process response from the handler
				server.processHandlerResonse(res, method, trimmedPath, statusCode, payload, contentType);
			});
		} catch(e){
			debug(e);
			server.processHandlerResonse(res,method,trimmedPath,500,{'Error': 'An unkown error has occured'},'json');
		}

	});
}


// Define a request router
server.router = {
	''               : handlers.index,
	'account/create' : handlers.accountCreate,
	'account/edit'   : handlers.accountEdit,
	'account/deleted':handlers.accountDeleted,

	'session/create' : handlers.sessionCreate,
	'session/deleted': handlers.sessionDeleted,

	'checks/all'     :handlers.checksList,
	'checks/create'  : handlers.checksCreate,
	'checks/edit'    : handlers.checksEdit,

	'ping'           : handlers.ping,
	'favicon.ico'    : handlers.favicon,

	'public'         : handlers.public,

	'api/checks'     : handlers.checks,
	'api/tokens'     : handlers.tokens,
	'api/users'      : handlers.users,

	'examples/error' : handlers.exampleError
};

// Init script
server.init = function(){
	// Start the HTTP server, and have it listen on env defined port
	server.httpServer.listen(config.httpPort, () => {
		console.log(`The HTTP server is listening on port ${config.httpPort}`);
	} );

	// Start the HTTPS server, and have it listen on env defined port
	server.httpsServer.listen(config.httpsPort, () => {
		console.log(`The HTTPSserver is listening on port ${config.httpsPort}`);
	} );


}

// Export the server
module.exports = server;
