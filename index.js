//  Primary file for the API

// Depencies
const http = require('http');

const url  = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');

// The server should respond to all request with a string
const server = http.createServer( (req, res) =>{

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

} );

// Start the server, and have it listen on poer 3000
server.listen(config.port, () => {
	console.log(`The server is listening on port ${config.port} using in ${config.envName} mode. `);
} );


//Define the handlers
const handlers = {};

//Sample handler
handlers.sample =(data,callback) => {
	// callback a http satus code and payload object
	callback(406, {'name': 'sample handler'});
};

handlers.notFound = (data, callback) => {
	callback(404);
};

// Defind a reqst router
const router = {
	'sample': handlers.sample,
};

