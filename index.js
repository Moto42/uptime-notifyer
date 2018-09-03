//  Primary file for the API




// Dependencies
const http          = require('http');
const https         = require('https');
const url           = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config        = require('./config');
const fs            = require('fs');
const _data         = require('./lib/data');




// Instantiating the HTTP server
const httpServer = http.createServer( (req, res) =>{
	unifiedServer(req, res);
} );

// Start the HTTP server, and have it listen on env defined port
httpServer.listen(config.httpPort, () => {
	console.log(`The HTTP server is listening on port ${config.httpPort}`);
} );

// Instantiating the HTTPS server
const httpsServerOptions = {
	'key' : fs.readFileSync('./ssl/key.pem'),
	'cert' : fs.readFileSync('./ssl/cert.pem'),
};
const httpsServer = https.createServer(httpsServerOptions,(req, res) =>{
	unifiedServer(req, res);
} );

// Start the HTTPS server, and have it listen on env defined port
httpsServer.listen(config.httpsPort, () => {
	console.log(`The HTTPSserver is listening on port ${config.httpsPort}`);
} );


// all the server logic for both the http and https server
const unifiedServer = (req, res) =>{

	//get the url and parse it
	const parsedURL = url.parse(req.url, true);

	//get the path from the url
	const path = parsedURL.pathname;
	const trimmedPath = path.replace(/^\/+|\/+$/g,'');

	// Get Query String as an object
	const queryStringObject = parsedURL.query;

	// Get the HTTP method
	const method = req.method.toUpperCase();

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
		const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound

		//construct data object to send to handler
		const data = {
			'trimmedPath' : trimmedPath,
			'queryStringObject': queryStringObject,
			'method': method,
			'headers': headers,
			'payload': buffer,
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
		console.log('Returning this response',statusCode,payloadString);

		});

	});
}


//Define the handlers
const handlers = {};

// Ping Handler
handlers.ping = (data,callback)=>{
	callback(200,{'res':"pong"});
}

// 404 handler
handlers.notFound = (data, callback) => {
	callback(404);
};

// Define a request router
const router = {
	'sample' : handlers.sample,
	'ping': handlers.ping,
};

