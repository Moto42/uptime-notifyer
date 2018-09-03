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








module.exports = helpers;