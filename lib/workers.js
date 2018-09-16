//
// Workers related tasks

// Dependencies
const path    = require('path');
const fs      = require('path');
const _data   = require('./data');
const https   = require('https');
const http    = require('http');
const helpers = require('./helpers');
const url     = require('url');
const _logs   = require('./logs');
const util    = require('util');

const debug = util.debuglog('workers');

// instantiate the workers object
const workers = {};

workers.gatherAllChecks = function() {
	
	// get all the checks that exist in the system
	_data.list('checks',function(err,checks){
		if(!err && checks && checks.length > 0){
			checks.forEach(function(check){
				//Read in the chec data
				_data.read('checks',check, function(err,originalCheckData){
					if(!err && originalCheckData){
						// pass the originalCheckData to the check validator
						workers.validateCheckData(originalCheckData);
					} else {
						debug("error reading one of the checks's data")
					}
				});
			});
		} else {
			debug("Error: Could not find any checks to process");
		}
	});
};


//Sanity Checking the Check Data
workers.validateCheckData = function(originalCheckData) {
	//Sanity-check the check-data
	originalCheckData = 
		typeof(originalCheckData) == 'object' 
		&& originalCheckData !== null 
	? originalCheckData : {};

	originalCheckData.id = 
		typeof(originalCheckData.id) == 'string' 
		&& originalCheckData.id.trim().length == 20 
	? originalCheckData.id.trim() : false;
	
	originalCheckData.userPhone =
		typeof(originalCheckData.userPhone) == 'string' 
		&&  originalCheckData.userPhone.trim().length == 10 
	? originalCheckData.userPhone.trim() : false;
	
	originalCheckData.protocol =
		typeof(originalCheckData.protocol) == 'string' 
		&&  ['http','https'].indexOf(originalCheckData.protocol) > -1 
	? originalCheckData.protocol : false;
	
	originalCheckData.url  =
		typeof(originalCheckData.url) == 'string' 
		&& originalCheckData.url.trim().length > 0 
	? originalCheckData.url.trim() : false;
	
	originalCheckData.method =
		typeof(originalCheckData.method) == 'string' 
		&& ['post','get','put','delete'].indexOf(originalCheckData.method) > -1 
	? originalCheckData.method : false;
	
	originalCheckData.successCodes =
		typeof(originalCheckData.successCodes) == 'object' 
		&& originalCheckData.successCodes instanceof Array 
		&& originalCheckData.successCodes.length > 0 
	? originalCheckData.successCodes : false;
	
	originalCheckData.timeoutSeconds =
		typeof(originalCheckData.timeoutSeconds) == 'number'
		&& originalCheckData.timeoutSeconds % 1 === 0
		&& originalCheckData.timeoutSeconds >= 1
		&& originalCheckData.timeoutSeconds <= 5
	? originalCheckData.timeoutSeconds : false;

	// set the keys that may not be set (if the workers have never seen this check before)
	originalCheckData.state =
		typeof(originalCheckData.state) == 'string' 
		&& ['up','down'].indexOf(originalCheckData.state) > -1 
	? originalCheckData.state : 'down';

	originalCheckData.lastChecked =
		typeof(originalCheckData.lastChecked) == 'number' 
		&& originalCheckData.lastChecked > 0 
	? originalCheckData.lastChecked : false;

	// if all the checks pass pass the data along to the next step  in the process

		debug("timeoutSeconds", originalCheckData.timeoutSeconds);
	if(
		originalCheckData.id &&
		originalCheckData.userPhone &&
		originalCheckData.protocol &&
		originalCheckData.url &&
		originalCheckData.method &&
		originalCheckData.successCodes &&
		originalCheckData.timeoutSeconds
	) {
		workers.performCheck(originalCheckData);
	} else {
		debug("Error: One of the checks is not properly formated; skipping it.")
	}
};

// Perform the check, send the originalCheckData and the outcome of the check process, to the next step in the process 
workers.performCheck = function(originalCheckData) {
	// perpare the initial check outcome
	let checkOutcome = {
		'error' : false,
		'responseCode' : false,
	};

	//Mark that the outcome has not been sent yet
	let outcomeSent = false;

	//Parst the hostname and the path out of the original check data
	const parsedURL =url.parse(originalCheckData.protocol+'://'+originalCheckData.url,true);
	const hostname = parsedURL.hostname;
	const path = parsedURL.path; // Using path, and not 'pathname' becase we want the querystring

	//construct the request
	const requestDetails = {
		protocol: originalCheckData.protocol+':',
		hostname: hostname,
		method  : originalCheckData.method.toUpperCase(),
		path    : path,
		timeout : originalCheckData.timeoutSeconds *1000,
	}

	//instantiate the request object (using either the http or https module)
	const _moduleToUse = originalCheckData.protocol == 'http' ? http :https;
	const req = _moduleToUse.request(requestDetails, function(res){
		// grab the status of the sent request
		let status = res.statusCode;

		// update the checkOutcome and pass the data along
		checkOutcome.responseCode = status;
			if(!outcomeSent){
				workers.processCheckOutcome(originalCheckData,checkOutcome);
				outcomeSent = true;
			}
	});

	// bind to the erro event soe it doesn't get thrown
	req.on('error',function(err){
		//Update the checkOutcome and pass the data along
		checkOutcome.error = {
			error : true,
			value : e,
		}
		if(!outcomeSent){
			workers.processCheckOutcome(originalCheckData,checkOutcome);
				outcomeSent = true;
		}
	});

	// Bind to the timeout event
	req.on('timeout',function(err){
		//Update the checkOutcome and pass the data along
		checkOutcome.error = {
			error : true,
			value : 'timeout',
		};
		if(!outcomeSent){
			workers.processCheckOutcome(originalCheckData,checkOutcome);
				outcomeSent = true;
		}
	});

	// End the request
	req.end();

};


// Process the checkOutcome and update the check  data as needed, trigger an alert to the user if needed.
// Special logic for accomidating a chec that has never been processed before (do not alert on these)
workers.processCheckOutcome = function(originalCheckData,checkOutcome){
	// decide if the chec is considered up or down
	let state =
	 !checkOutcome.error && 
	 checkOutcome.responseCode && 
	 originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
	? 'up' : 'down';

	// Decide if an alert is warranted
	var alertWarranted =
		originalCheckData.lastChecked &&
		originalCheckData.state !== state
	? true : false;

	// log the outome
	// log the original check data
	const timeOfCheck = Date.now()
	workers.log(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck)

	//update the checkData
	const newCheckData = originalCheckData;
	newCheckData.state = state;
	newCheckData.lastChecked = timeOfCheck;


	// Save the updates
	_data.update('checks',newCheckData.id,newCheckData,function(err){
		if(!err){
			// send  the new check data to the next phase in the process if needed.
			if(alertWarranted){
				workers.alertUserToStatusChange(newCheckData);
			}	else{
				debug('check outcome has not changed, no alert needed');
			}
		} else {
			debug('Error trying to save upates to one of the checks');
		}
	})

}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = function(newCheckData){
	const msg = 'Alert: Your check for '+newCheckData.method.toUpperCase()+newCheckData.protocol+'://'+newCheckData.url+' is currently '+newCheckData.state+'.'
	helpers.sendTwilioSMS(newCheckData.userPhone,msg,function(err){
		if(!err){
			debug('Success: user was alerted to a change in their check state via SMS.: ',msg);
		} else {
			debug('Error alerting user to check state change via SMS');
		}
	})
};


workers.log = function(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck) {
	// For the log data
	const logData = {
		'check'       : originalCheckData,
		'checkOutcome': checkOutcome,
		'state'       : state,
		'alert'       : alertWarranted,
		'time'        : timeOfCheck,
	}

	// convert date to a string
	const logString = JSON.stringify(logData);

	// Determine the name of the log file
	const logFileName = originalCheckData.id;

	//aapend the logstring to the file we want to write to.
	_logs.append(logFileName,logString,function(err){

		if(!err){
			debug('Logging to file succeeded: ',logFileName);
		} else {
			debug('Logging to file failed: ',logFileName);
		}
	})

}


//// Timer to execute the  worker-process once per minute
workers.loop = function() {
	setInterval(function(){
		workers.gatherAllChecks();
	},1000*60 )
	
};

// Rotatate (coompres) the logfiles
workers.rotateLogs = function(){
	//lsist all the (noncompressed) log files
	_logs.list(false,function(err,logs){
		
		if(!err && logs && logs.length >0){
			logs.forEach(function(logName){
				//compress the data to a different file
				const logID = logName.replace('.log','');
				const newFileId = logID+'-'+Date.now();
				_logs.compress(logID,newFileId,function(err){
					if(!err){
						//Truncate the log
						_logs.truncate(logID,function(err){
							if(!err){
								debug('success truncating log file');
							} else {
								debug('error truncating log file: ', err);
							}
						});
					} else {
						debug('Error compressing one of the log files: ', err);
					}
				});
			});
		} else {	
			debug('error, could not find logs to rotate');
		}
	});
}

// Timer to execute the log rotation proccess once per day
//// Timer to execute the  worker-process once per minute
workers.logRotationLoop = function() {
	setInterval(function(){
		workers.rotateLogs();
	},1000*60*60*24 )
	
};

workers.init = function(){

	//Send to console in yellow
	console.log('\x1b[31m', 'Background workers are working' ,'\x1b[0m');

	// Execute all the checks
	workers.gatherAllChecks();
	// Call the loop so the checks will execute on their own
	workers.loop();
	// COmpress all  the logs immedietly
	workers.rotateLogs();

	//Call the compression loop so logs will be compressed later on
	workers.logRotationLoop();
}



// export the module
module.exports = workers;