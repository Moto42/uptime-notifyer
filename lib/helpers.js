// various helper functions

//dependencies 
const crypto      = require('crypto');
const config      = require('../config');
const querystring = require('querystring');
const https       = require('https');
const path        = require('path');
const fs          = require('fs');

//container for the helpers
const helpers = {}

//Sampel fro testing that simpley returns a humber
helpers.getANumber = function(){
	return 1;
}

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
	msg   = typeof(msg)   == 'string' &&   msg.trim().length <= 1600 ?   msg.trim() : false;
	
	if(phone && msg){

		//configure the request payload
		const payload = {
			'From': '+1'+config.twilio.fromPhone,
			'To'  : '+1'+phone,
			'Body': msg
		}
		//Stringify payload
		const stringPayload = querystring.stringify(payload);
		
		//configure the reuqest details
		const requestDetails = {
			'protocol': 'https:',
			'hostname': 'api.twilio.com',
			'method'  : 'POST',
			'path'    : '/2010-04-01/Accounts/'+config.twilio.accountSID+'/Messages.json',
      'auth'    :  config.twilio.accountSID+':'+config.twilio.authToken,
			'headers' : {
				'Content-Type'  : 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(stringPayload)
			}
		};

		// instantiate the reqest Object
		const req = https.request(requestDetails,function(res){
			// Grab the status of the sent request
			const status = res.statusCode;
			//callback successfully if the request went through
			if(status == 200 || status == 201){
				callback(false);
			} else {
				callback({'error' : 'Status Code Returned was '+status,
					});//'res':res
			}
		});

		//bind to an error event
		req.on('error',function(e){
			callback(e);
		});
		// add the payload
		req.write(stringPayload);

		// send off the 
		req.end();
		
	} else { 
		callback(400, {'error': 'given parameters were missing or invalid'})
	};

};

//Get the string content of a template.
helpers.getTemplate = function(templateName, data,callback){

	templateName = sanity.templateName(templateName);
	data = sanity.object(data);

	if(templateName){
		const templatesDir = path.join(__dirname,'/../templates/');
		fs.readFile(templatesDir+templateName+'.html','utf8', function(err, str){
			if(!err && str && str.length >0){
				// Do the interpolation on the string
				const finalString = helpers.interpolate(str,data);
				callback(false,finalString);
			} else {
				callback('No Template could be found');
			}
		});
	}else{
		callback('A valid templateName was not specified');
	}
}

// Add the universal header and footer to a string and pass the provided data object to the provided data object to the header and footer for interpolation
helpers.addUniversalTemplates = function(str,data,callback){
	str = sanity.string(str);
	data = sanity.object(data);
	//Get the header
	helpers.getTemplate('_header',data,function(err,headerString){
		if(!err && headerString){
			//Get the footer
			helpers.getTemplate('_footer',data,function(err,footerString){
				if(!err && footerString){
					// Add the three strings together
					const fullString = headerString+str+footerString;
					callback(false,fullString);
				} else {
					callback('could not find footer template');
				}
			});
		} else {
			callback('Could not find the header template');
		}
	});
}

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = function(str,data){
	str = sanity.string(str);
	data = sanity.object(data);

	//Add the templateGlobals to the data object, prepending their key name with the "global" prefix
	for(var keyName in config.templateGlobals){
		if(config.templateGlobals.hasOwnProperty(keyName)){
			data['global.'+keyName] = config.templateGlobals[keyName];
		}
	}

	// For each key in the data object, insert its value into the string at the corresponding placeholder
	for(var key in data){
		if(data.hasOwnProperty(key) && typeof(data[key]) == 'string'){
			let replace = data[key];
			let find = '{'+key+'}';
			str = str.replace(find,replace);
			}
	}
	return str;
}

// Get the contents of a static (aka publie) asset
helpers.getStaticAsset = function(fileName, callback){
	fileName = sanity.string(fileName);
	if(fileName){
		const publicDir = path.join(__dirname,'/../public/');
		fs.readFile(publicDir+fileName,function(err,data){
			if(!err && data){
				callback(false,data);
			} else{
				callback('file could not be found');
			}
		});
	} else {
		callback('A valid fileName was not specified.')
	}
};

//Sanity Checking object
const sanity = {};

sanity.templateName = function(templateName){
	return typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false 
};
sanity.string = function(string){
	return typeof(string)=='string' && string.length>0 ? string : '';
}
sanity.object = function(obj){
	return typeof(obj)=='object' && obj !== null ? obj :{};
}


module.exports = helpers;