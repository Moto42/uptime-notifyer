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

// Users - get
// required fields: phone
// optional fields: none
// @TODO only allow authenticated users access their object. Do not allow access to the objects of other users.
handlers._users.get = function(data, callback){
	// check that the phone number is valid
	const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
	if(phone){
		//Lookup the user
		_data.read('users',phone,function(err,data){
			if(!err && data){
				// remove the hashed password from the user object before returning it to the requestor
				delete data.hashedPassword;
				callback(200,data);
			} else {
				callback(404)
			}
		})
	}else {
		callback(400, {'Error': 'Missing required field'});
	}
}

// Users - put update a user
// required fields: phone
// optional fields: firstName, LastName, Password <At least one must be specified>
// @TODO only allow authenticated users update their object. Do not allow updates to the objects of other users.
handlers._users.put = function(data, callback){
	// check for the required field
	const phone        = typeof(data.payload.phone)        == 'string'  && data.payload.phone.trim().length == 10   ? data.payload.phone.trim()    : false;	
	// check for optional fields
	const firstName    = typeof(data.payload.firstName)    == 'string'  && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim(): false;
	const lastName     = typeof(data.payload.lastName)     == 'string'  && data.payload.lastName.trim().length > 0  ? data.payload.lastName.trim() : false;
	const password     = typeof(data.payload.password)     == 'string'  && data.payload.password.trim().length > 0  ? data.payload.password.trim() : false;
	if(phone){
		if(firstName || lastName || password){
			//Lookup user
			_data.read('users',phone,function(err,userData){
				if(!err && userData){
					//update the user data as nessisary
					if(firstName){ userData.firstName      = firstName; }
					if(lastName) { userData.lastName       = lastName; }
					if(password) { userData.hashedPassword = helpers.hash(password);}
					//Store the new data
					_data.update('users',phone,userData,function(err){
						if(!err){
							callback(200);
						} else {
							console.log(err);
							callback(500, {'Error':'could not update the user'})
						}
					});
				} else {
					callback(400, {'Error':'The User Specified does not exist'});
				}
			});


		} else {
			callback(400,{'Error':'Missing fields to update'});
		}
	} else {
		callback(400,{'Error':'Missing required field'})	;
	}
}

// Users - delete  Delet a user account
// required fields: phone, password
// optional fields: none
// @TODO only let an authenticated user delet their own object, do not allow them to delete other user's accounts
// @TODO Cleanup (delete) any other  data files associated with this user
handlers._users.delete = function(data, callback){
	// check that the phone number is valid
	const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
	if(phone){
		//Lookup the user
		_data.read('users',phone,function(err,data){
			if(!err && data){
				_data.delete('users',phone,function(err){
					if(!err){
						callback(200);
					}else{
						console.log('ERROR: ',err);
						callback(500,{'Error':'Error deleting user'});
					}
				})
			} else {
				callback(400,{'Error':'Could not find specified user'});
			}
		})
	}else {
		callback(400, {'Error': 'Missing required field'});
	}

}

//export the module
module.exports = handlers;
