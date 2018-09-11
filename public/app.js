// Frontend Logic for the Application

// container for the frontend application
const app ={}

// Config

app.config = {
	'sessionToken': false,
}

// AJAX client for the RESTful API
app.client = {};

// interface for making API calls
app.client.request = function(headers,path,method,queryStringObject,payload,callback){
	//Set defaults
	headers  = defaults.headers(headers);
	path     = defaults.path(path);
	method   = defaults.method(method);
	payload  = defaults.payload(payload);
	callback = defaults.callback(callback);
	queryStringObject = defaults.queryStringObject(queryStringObject);

	// for each query string paramet sernt, add it to the path
	let requestUrl = path+'?';
	let counter = 0;
	for(var queryKey in queryStringObject){
		if(queryStringObject.hasOwnProperty(queryKey)){
			counter++;
			//if at least one querystring paramer has already been added, prepend new ones with an amperstand
			if(counter > 1){
				requestUrl += '&';
			}
			//add the key and value
			requestUrl += queryKey+= '=' +queryStringObject[queryKey];
		}
	}
	//Form the http request as a JSON type
	let xhr = new XMLHttpRequest();
	xhr.open(method,requestUrl,true);
	xhr.setRequestHeader("Content-Type", "application/json");

	//for each header sent, add it to the request
	for(var headerKey in headers){
		if(headers.hasOwnProperty(headerKey)){
			xhr.setRequestHeader(headerKey, headers[headerKey]);
		}
	}

	//if there is a current session token set, add that as a header
	if(app.config.sessionToken){
		xhr.setRequestHeader("token", app.config.sessionToken.id);
	}
	// When the request comes back, handle the response
	xhr.onreadystatechange = function(){
		if(xhr.readyState == XMLHttpRequest.DONE){
			const statusCode = xhr.status;
			const responseReturned = xhr.responseText;

			// Callback if requested
			if(callback){
				try{
					let parsedResponse = JSON.pars(responseReturned);
					callback(statusCode, parsedResponse);
				} catch(e){
					callback(statusCode,false);
				}
			}
		}
	}
	//Send the payload as JSON
	const payloadString = JSON.stringify(payload);
	xhr.send(payloadString);
}


//Default checker/setter functions
const defaults = {
	headers : function(header){return typeof(header) == 'object' &&
	 headers !== null 
	 ? headers : {} },
	path    : function(path){return typeof(path)=='string' ? path : '/' },
	method  : function(method){return typeof(method)=='string' &&
		['POST','GET','PUT','DELETE'].indexOf(method) > -1 
		? method : '/' },
	payload : function(header){return typeof(header) == 'object' &&
	 payload !== null 
	 ? payload : {};},
	callback    : function(callback){return typeof(callback)=='function' ? callback : false},
	queryStringObject : function(header){return typeof(header) == 'object' &&
	 queryStringObject !== null 
	 ? queryStringObject : {};},
}