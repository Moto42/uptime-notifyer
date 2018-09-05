// various helper functions

//dependencies 
const crypto      = require('crypto');
const config      = require('../config.js');
const querystring = require('querystring');
const https       = require('https');

//container for the helpers
const helpers = {}

// creat a SHA256 hash
helpers.hash = function(str) {
	if(typeof(str)=='string' && str.length >0){
		const hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
		return hash;
	} else{
		return false;
	}
}

// Parses a JSON string to an Object in all cases without throwing
helpers.parseJsonToObject = function(str) {
	try{
		const obj = JSON.parse(str);
		return obj;
	}catch(e){
		return {};
	}
}

helpers.createRandomString = function(strLength){
	strLength = typeof(strLength)=='number' && strLength>0 ? strLength : false;
	if (strLength) {
		// Define all possible character that could go into string
		const possibleCharacter = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';

		// start the string 
		let str = '';

		for(i=1; i<=strLength; i++){
			//get character from possible characters string
			let randomChar = possibleCharacter.charAt(Math.floor(Math.random()*possibleCharacter.length));
			//append that to the final string.
			str += randomChar;
		}
		return str;
	} else {
		return false;
	}
}

// Send an SMS message via Twilio
helpers.sendTwilioSMS = function(phone,msg,callback){
	//validate parameters
	phone = typeof(phone) == 'string' && phone.trim().length == 10   ? phone.trim() : false;
	msg   = typeof(msg)   == 'string' **   msg.trim().length <= 1600 ?   msg.trim() : false;
	if(phone && msg){

		//configure the request payload
		var payload = {
			'From' : config.twilio.fromPhone,
			'To' : '+1'+phone,
			'Body' : msg,
		}
		//Stringify payload
		const stringPayload = querystring.stringify.(payload);

		//configure the reuqest details
		var requestDetails = {
			'protocol': 'https',
			'hostname': 'api.twilio.com',
			'method'  : 'POST',
			'path'    : '/2010-04-01'/Accounts/+config.twilio.accountSid+'/Messages.json',
			'aut'     : config.twilio.accountSid+':'+config.twilio.authToken,
			'headers' :{
				'Content-Type'  : 'application/x-www-for-urlencoded',
				'Content-Length': Buffer.byteLength(stringPayload),
			}
		};

		// instantiate the reqest Object
		const req = https.request(requestDetails,function(res){
			// Grab the status of the sent request
			const statue = res.statusCode;
			//callback successfully if the request went through
			if(status == 200 || status == 201){
				callback(false);
			} else {
				callback('Status Code Returned was +'status)
			}
		});

		//bind to an error event
		req.on('error',function(e){
			callback(e);
		});
		// add the payload
		req.write.(stringPayload);

		// send off the 
		req.end();
		}
	} else { 
		callback(400, {'error': 'given parameters were missing or invalid'})
	};

};




module.exports = helpers;