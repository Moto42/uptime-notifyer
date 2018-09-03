// Handlers for the various requests.

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');


//Define the handlers
const handlers = {};


// 404 handler
handlers.notFound = (data, callback) => {
	callback(404);
};

// Ping Handler
handlers.ping = (data,callback)=>{
	callback(200,{'res':"pong"});
}

// Users handler
handlers.users = (data, callback)=>{
	const acceptableMethods = ['post','get','put','delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._users[data.method](data,callback);
	} else {
		callback(405);
	}
};

//container for the users submethods
handlers._users ={};

// Users - post
// required fields: firstName, LastName, phone, password, tosAgreement
// optional fields: none
handlers._users.post = function(data, callback){
	//check that all required fields are fille out
	const firstName    = typeof(data.payload.firstName)    == 'string'  && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim(): false;
	const lastName     = typeof(data.payload.lastName)     == 'string'  && data.payload.lastName.trim().length > 0  ? data.payload.lastName.trim() : false;
	const phone        = typeof(data.payload.phone)        == 'string'  && data.payload.phone.trim().length == 10   ? data.payload.phone.trim()    : false;
	const password     = typeof(data.payload.password)     == 'string'  && data.payload.password.trim().length > 0  ? data.payload.password.trim() : false;
	const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true        ? data.payload.tosAgreement    : false;

	if(firstName && lastName && phone && password && tosAgreement){
		//Make sure user does not already exist, by phone number
		_data.read('users',phone,function(err,data){
			if(err){ //Valid number that does not already exist in the system
				// Hash the password
				const hashedPassword = helpers.hash(password);

				// Create the user object
				if(hashedPassword){

					const userObject = {
						'firstName' : firstName,
						'lastName' : lastName,
						'phone' : phone,
						'hashedPassword' : hashedPassword,
						'tosAgreement' : true,
					};

					// store the user
					_data.create('users',phone,userObject, function(err){
						if(!err){
							callback(200);
						} else {
							console.log(err);
							callback(500, {'Error':'Could not create a new user'})
						}
					})
				} else {
					callback(500, {'Error':'Could not hash password'})
				}


			} else {
				callback(400, {'Error':'User with that phone number already exists'});
			}

		})		
	} else {
		callback(400,{'Error':'Missing required fields'})
	}
}

// required fields: 
// optional fields: 
// Users - get
handlers._users.get = function(data, callback){
	
}

// required fields: 
// optional fields: 
// Users - put
handlers._users.put = function(data, callback){
	
}

// required fields: 
// optional fields: 
// Users - delete
handlers._users.delete = function(data, callback){
	
}

//export the module
module.exports = handlers;