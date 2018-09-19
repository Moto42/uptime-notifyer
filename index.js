//  Primary file for the API

//demendencies
const server  = require('./lib/server');
const workers = require('./lib/workers');
const cli     = require('./lib/cli');





//declare the app
const app = {};

//Init function
app.init = function(){

	process.title = "Uptime Notification Server";

	// start the server
	server.init();

	// start the workers
	workers.init();

	// Start the CLI, but make sure it starts last
	setTimeout(function(){ cli.init()	},50);
};

//Execute
app.init();


//Export the app
module.exports = app;