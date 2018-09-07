//
// Worker related tasks

// Dependencies
const path    = require('path');
const fs      = require('path');
const _data   = require('./data');
const https   = require('https');
const http    = require('http');
const helpers = require('./helpers');
const url     = require('url');

// instantiate the worker object
const workers = {};

workers.gatherAllChecks = function() {
	// get all the checks that exist in the system
	_data.list('checks',function(err,checks){

		//@TODO DELETE THIS
		console.log('error',err);
		console.log('checks',checks);
		
		if(!err && checks && checks.length > 0){
			checks.forEach(function(check){
				//Read in the chec data
				_data.read('checks',check, function(err,originalCheckData){
					if(!err && originalCheckData){
						// pass the originalCheckData to the check validator
						workers.validateCheckData(originalCheckData);
					} else {
						console.log("error reading one of the checks's data")
					}
				});
			});
		} else {
			console.log("Error: Could not find any checks to process");
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
	
	originalCheckData.timeOutSeconds =
		typeof(originalCheckData.timeOutSeconds) == 'number'
		&& originalCheckData.timeOutSeconds % 1 === 0
		&& originalCheckData.timeOutSeconds >= 1
		&& originalCheckData.timeOutSeconds <= 5
	? originalCheckData.timeOutSeconds : false;

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
	if(
		originalCheckData.id &&
		originalCheckData.userPhone &&
		originalCheckData.protocol &&
		originalCheckData.url &&
		originalCheckData.method &&
		originalCheckData.successCodes &&
		originalCheckData.timeOutSeconds
	) {
		workers.performCheck(originalCheckData);
	} else {
		console.log("Error: One of the checks is not properly formated; skipping it.")
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
		method  : originalCheckData.method.toUpperCase,
		path    : path,
		timeout : originalCheckData.timeOutSeconds *1000,
	}

	//instantiate the request object (using either the http or https module)
	const _moduleToUse = originalCheckData.protocol == 'http' ? http :https;
	const req = _moduleToUse.request(requestDetails, function(res){
		// grab the status of the sent request
		let status = res.statusCode;

		// update the checkOutcome and pass the data along
		checkOutcome.responseCode = status;
			if(!outcomeSent){
				worker.processCheckOutcome(originalCheckData,checkOutcome);
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
			worker.processCheckOutcome(originalCheckData,checkOutcome);
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
			worker.processCheckOutcome(originalCheckData,checkOutcome);
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

	//update the checkData
	const newCheckData = originalCheckData;
	newCheckData.state = state;
	newCheckData.lastChecked = Date.now();

	// Save the updates
	_data.update('checks',newCheckData.id,newCheckData,function(err){
		if(!err){
			// send  the new check data to the next phase in the process if needed.
			if(alertWarranted){
				workers.alertUserToStatusChange(newCheckData);
			}	else{
				console.log('check outcome has not changed, no alert needed');
			}
		} else {
			console.log('Error trying to save upates to one of the checks');
		}
	})

}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = function(newCheckData){
	const msg = 'Alert: Your check for '+newCheckData.method.toUpperCase()+newCheckData.protocol+'://'+newCheckData.url+' is currently '+state+'.'
	helpers.sendTwilioSMS(newCheckData.userPhone,msg,function(err){
		if(!err){
			console.log('Success: user was alerted to a change in their check state via SMS.: ',msg);
		} else {
			console.log('Error alerting user to check state change via SMS');
		}
	})
};


//// Timer to execute the  worker-process once per minute
workers.loop = function() {
	setInterval(function(){
		workers.gatherAllChecks();
	},1000*5 )
	//@TODO return interval to 1000*60 
};

workers.init = function(){
	// Execute all the checks
	workers.gatherAllChecks();
	// Call the loop so the checks will execute on their own
	workers.loop();
}



// export the module
module.exports = workers;