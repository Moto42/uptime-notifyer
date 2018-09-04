// various helper functions

//dependencies 
const crypto = require('crypto');
const config = require('../config.js');


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






module.exports = helpers;