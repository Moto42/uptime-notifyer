//  Primary file for the API

//demendencies
const server = require('./lib/server');
const workers = require('./lib/workers');

//Testing 
const _data =require('./lib/data');
_data.list('checks',console.log);


//declare the app
const app = {};

//Init function
app.init = function(){

	// start the server
	server.init();

	// start the workers
	workers.init();
};

//Execute
app.init();


//Export the app
module.exports = app;