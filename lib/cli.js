//CLI-related tasks

//Dependencies
const readline = require('readline');
const util     = require('util');
const debug    = util.debuglog('cli');
const events   = require('events');
class _events extends  events{};
const e        = new _events();
const os       = require('os');
const v8       = require('v8');
const _data    = require('./data');
const helpers  = require('./helpers');
const _logs    = require('./logs')

// instantiat the CLI module object
const cli = {};

//Create vertical space
cli.verticalSpace = function(lines) {
	lines = typeof(lines) == 'number' && lines >0 ? lines : 1;
	for(i=0; i<lines; i++){
		console.log('');
	}
}

//create a horizontal line across the screen
cli.horizontalLine = function(){
	// get the available scree size
	const width = process.stdout.columns;
	let line = '';
	for (i=0; i<width; i++){
		line+='-';
	}
	console.log(line);
}

//create centered text on the screen
cli.centered = function(str){
	string = typeof(str) == 'string' && str.trim().length > 0 ? str.trim() : '';
	// get the available scree size
	const width = process.stdout.columns;
	//calculate left padding
	let leftPadding = Math.floor((width - str.length)/2);
	// put in left padded spaces before the string itself
	var line = '';
	for (i=0; i<width; i++){
		line+=' ';
	}
	line+=str;
	console.log(line);
}



// Input handlers
e.on('man' ,function(str){ cli.responders.help(); });
e.on('help',function(str){ cli.responders.help(); });
e.on('exit',function(str){ cli.responders.exit(); });
e.on('stats',function(str){ cli.responders.stats(); });
e.on('list users',function(str){ cli.responders.listUsers(); });
e.on('more user info',function(str){ cli.responders.moreUserInfo(str); });
e.on('list checks',function(str){ cli.responders.listChecks(str); });
e.on('more check info',function(str){ cli.responders.moreCheckInfo(str); });
e.on('list logs',function(str){ cli.responders.listLogs(); });
e.on('more log info',function(str){ cli.responders.moreLogInfo(str); });

// Responders object
cli.responders = {};

// help/man
cli.responders.help = function() {
	const commands = {
		'exit' : 'Kill the CLI, Server, and the rest of the application', 
		'man' : 'Show this help page',
		'help' : 'Alias of the "man" command',
		'stats' : ' Get statistis on the underly operating system and resource utilisation',
		'list users' : 'Show a list of all the register (undelete) users in the stystem',
		'more user info --{UserId}' : 'Show detailes of a specific user',
		'list checks --up --down' : 'Show a list of all the active checks in the system, and their up/down status. The --up and --down flags will display only the up/down checks as appropriate',
		'more check info --{checkId}' : 'Show details of a specified check',
		'list logs' : 'Show a list of all log files to be read, compressed and uncompressed',
		'more log info --{filename}' : 'Show details of a specified log file.',
	}

	// Show a header for the help page that is as wide as the screen
	cli.horizontalLine();
	cli.centered('CLI MANUAL');
	cli.verticalSpace(2);

	//Show each command, followed by its explination, in white and yellow respectivly
	for(var key in commands){
		if(commands.hasOwnProperty(key)){
			let value = commands[key]
			let line = '\x1b[33m'+key+'\x1b[0m';
			let padding = 40-line.length;
			for(i=0;i<padding;i++){
				line+=' ';
			}
			line+=value
			console.log(line);
			cli.verticalSpace();
		}
	}
	cli.verticalSpace()
	cli.horizontalLine();
}

// Exit
cli.responders.exit = function() {
	console.log("Goodbye");
	process.exit(0);
}

//Stats
cli.responders.listUsers = function() {

	
	//gather list of users
	_data.list('users',function(err,users){
		if(!err && Array.isArray(users) ==  true){
			if(users.length>0){


				//Header
				cli.horizontalLine();
				cli.centered('USERS LIST');
				cli.verticalSpace(2);


				// List User's first-last Name, phone number and number of checks
				_data.list('users',function(err, users){
					users.forEach(function(user){
						_data.read('users',user,function(err,userData){
							let userString = '';
							let checkNum = typeof(userData.checks) != 'undefined' && userData.checks.length > 0 ? userData.checks.length : 0;
							userString += 'Name: '+userData.firstName +' '+userData.lastName+', Phone: '+userData.phone+', Checks: '+checkNum;
							console.log(userString);
						})
					})
				});
			
			} else {
				console.log('There are no users registered.');
			}
		} else {
			console.log("There was an error retrieving the user data: ",err);
		}
	})
}

// more user info
cli.responders.moreUserInfo = function(str) {
	
	//Get the id from the string
	const arr = str.split('--');
	const userId = typeof(arr[1]) == 'string' && arr[1].length>0 ? arr[1].trim() : false

	if(userId){
		_data.read('users',userId, function(err,userData){
			if(!err && userData){
				delete userData.hashedPassword;

				cli.verticalSpace();
				console.log(userData);
				cli.verticalSpace();
			}
		});
	}
}

// list checks
cli.responders.listChecks = function(str) {
	_data.list('checks',function(err,checkList){
		if(!err && checkList){
			if(checkList.length >0){
				checkList.forEach((checkId)=>{
					_data.read('checks',checkId,(err, check)=>{
						console.log( 'id: '+check.id+', user: '+check.userPhone+', site: '+check.url );
					});
				})
			} else {
				console.log('No checks to display.')
			}
		} else {
			console.log('Error loading checks. Err: ',err);
		}
	});
}

//more check info
cli.responders.moreCheckInfo = function(str) {
	console.log("you asked for moreCheckInfo: ",str);
}

//Stats
cli.responders.stats = function() {
	// compile an object of stats
	const stats = {
		'Load Average' : os.loadavg().join(' '),
		'CPU counter' : os.cpus().length,
		'Free Memory' : os.freemem(),
		'Current Malloced Memory' : v8.getHeapStatistics().malloced_memory,
		'Peak Malloced Memory' : v8.getHeapStatistics().peak_malloced_memory,
		'Allocated Heap Used (%)' : Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size)*100),
		'Available Heap Allocated' : Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit)*100),
		'Uptime' : os.uptime() +' Seconds',
	}

	// 

	// create a header for the stats page
	cli.horizontalLine();
	cli.centered('STATISTICS');
	cli.verticalSpace(2);

	// Log out each stat
	for(var key in stats){
		if(stats.hasOwnProperty(key)){
			let value = stats[key]
			let line = '\x1b[33m'+key+'\x1b[0m';
			let padding = 40-line.length;
			for(i=0;i<padding;i++){
				line+=' ';
			}
			line+=value
			console.log(line);
			cli.verticalSpace();
		}
	}
	cli.verticalSpace()
	cli.horizontalLine();

}

cli.responders.listLogs = function() {
	_logs.list(true,function(err,logs){

		//Header
		cli.horizontalLine();
		cli.centered('LOGS LIST');
		cli.verticalSpace(2);

		logs.forEach(function(log){
			console.log(log);
		})

	//Footer
	cli.verticalSpace()
	cli.horizontalLine();

	})
}

//more log info
cli.responders.moreLogInfo = function(str) {
	console.log("you asked for moreLogInfo: ",str);
}




//Input processor
cli.processInput = function(str){
	str = typeof(str) == 'string' && str.trim().length >0 ? str.trim() : false;
	//ONly proces the input if the user actually wrote something, otherwise ignore it
	if(str){
		// Codify the uniqe strings that idenentify the allowed queries.

		const uniqueInputs = [
			'man',
			'help',
			'exit',
			'stats',
			'list users',
			'more user info',
			'list checks',
			'more check info',
			'list logs',
			'more log info',
		];
		// gor through  the possible inputs, emit an event when a match is found
		let matchFound = false;
		let counter = 0;
		uniqueInputs.some(function (input){
			if(str.toLowerCase().indexOf(input)>-1){
				matchFound = true;
				//emit an event matching the uniqe input anc inclue the full string given.
				e.emit(input,str);
				return true;
			}
		});

		// If no match is found, tell the user to try again
		if(!matchFound){
			console.log("Sorry,try again");
		}

	} // No else needed.
}




// initialisation script
cli.init = function(){
	//send the start message in dark blue
	console.log("\x1b[32mThe CLI is running...\x1b[0m");

	//Start the interface
	let _interface = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: '> ',
	})

	//create an initial promps
	_interface.prompt();

	// Handle each line of input seperately
	_interface.on('line', function(str){
		// send to the input processor
		cli.processInput(str);

		//reinitialise the prompt
		_interface.prompt();
	});

	// If the user stops the CLI, kill the associated process
	_interface.on('close', function(){
		process.exit(0);
	})
}



module.exports = cli;