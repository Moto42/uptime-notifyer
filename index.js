//  Primary file for the API

//demendencies
const server = require('./lib/server');
const workers = require('./lib/workers');



//declare the app
const app = {};

//Init function
app.init = function(){

	process.title = "Uptime Notification Server";

	// start the server
	server.init();

	// start the workers
	workers.init();
};

//Execute
app.init();


//Export the app
module.exports = app;