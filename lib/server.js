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
		const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound

		//construct data object to send to handler
		const data = {
			'trimmedPath'      : trimmedPath,
			'queryStringObject': queryStringObject,
			'method'           : method,
			'headers'          : headers,
			'payload'          : helpers.parseJsonToObject(buffer),
		}

		// route request to hander specified in the router
		chosenHandler(data,(statusCode,payload)=>{
			// use the callback defined by the handler or default to 200
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

			// use the payload defined by the handler or default to an empty object
			payload = typeof(payload) == 'object' ? payload : {};

			//convert payload object to string
			const payloadString = JSON.stringify(payload);

			//return the response
			res.setHeader('Content-Type','application/json');
			res.writeHead(statusCode);
			res.end(payloadString);

		//log what path was asked for
		const colorCode = statusCode === 200 ? "'\x1b[32m" : "'\x1b[31m"
		debug(colorCode,'Returning this response',statusCode,payloadString,"'\x1b[0m");

		});

	});
}


// Define a request router
server.router = {
	'checks': handlers.checks,
	'ping'  : handlers.ping,
	'tokens': handlers.tokens,
	'users' : handlers.users,
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