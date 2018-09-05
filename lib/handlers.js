// Handlers for the various requests.

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('../config');


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
handlers._users ={}; //handlers.user.<GET,POST,PUT,DELETE>

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
	handlers._users.get = function(data, callback){
		// check that the phone number is valid
		const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
		if(phone){
			// Get the token from the headers
			const token = typeof(data.queryStringObject.token) == 'string' && data.queryStringObject.token.trim().length == 20 ? data.queryStringObject.token.trim() : false;
			// Verify that the given token is valid for the phone number
			handlers._tokens.verifyToken(token, phone,function(tokenIsValid){
				if(tokenIsValid){
				
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

				} else {
					callback(403,{'error':'Missing require token in header or token is invalid'})
				}
			});

		}else {
			callback(400, {'Error': 'Missing required field'});
		}
	}

	// Users - put update a user
	// required fields: phone
	// optional fields: firstName, LastName, Password <At least one must be specified>
	handlers._users.put = function(data, callback){
		// check for the required field
		const phone        = typeof(data.payload.phone)        == 'string'  && data.payload.phone.trim().length == 10   ? data.payload.phone.trim()    : false;	
		// check for optional fields
		const firstName    = typeof(data.payload.firstName)    == 'string'  && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim(): false;
		const lastName     = typeof(data.payload.lastName)     == 'string'  && data.payload.lastName.trim().length > 0  ? data.payload.lastName.trim() : false;
		const password     = typeof(data.payload.password)     == 'string'  && data.payload.password.trim().length > 0  ? data.payload.password.trim() : false;
		if(phone){
			if(firstName || lastName || password){

			// Get the token from the headers
			const token = typeof(data.payload.token) == 'string' && data.payload.token.trim().length == 20 ? data.payload.token.trim() : false;
			// Verify that the given token is valid for the phone number
			handlers._tokens.verifyToken(token, phone,function(tokenIsValid){
				if(tokenIsValid){
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
						
								callback(500, {'Error':'could not update the user'})
							}
						});
					} else {
						callback(400, {'Error':'The User Specified does not exist'});
					}
				});
				}else{
					callback(403,{'error':'Missing require token in header or token is invalid'})
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
	// @TODO Cleanup (delete) any other  data files associated with this user
	handlers._users.delete = function(data, callback){
		// check that the phone number is valid
		const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
		const token = typeof(data.queryStringObject.token) == 'string' && data.queryStringObject.token.trim().length == 20 ? data.queryStringObject.token.trim() : false;
		
		handlers._tokens.verifyToken(token, phone,function(tokenIsValid){
				if(tokenIsValid){
					if(phone){
					//Lookup the user
						_data.read('users',phone,function(err,data){
							if(!err && data){
								_data.delete('users',phone,function(err){
									if(!err){
										callback(200);
									}else{
									
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
				} else {
					callback(403,{'error':'Missing require token in header or token is invalid'})
				}
			});


		
	}

// Tokens
handlers.tokens = (data, callback)=>{
	const acceptableMethods = ['post','get','put','delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._tokens[data.method](data,callback);
	} else {
		callback(405);
	}
};

//container for the tokens submethods
handlers._tokens = {} //handlers._tokens.<GET,POST,PUT,DELETE>

	//verify if a given token id is currently valid for a given user
	handlers._tokens.verifyToken = function(id,phone,callback){
		//Looup the token
		_data.read('tokens',id,function(err,tokenData){
			if(!err && tokenData){
				//check if the token has not expired and is for the given user
				if(tokenData.phone == phone && tokenData.expires > Date.now()){
					callback(true);
				} else {
					callback(false);
				}
			} else {
				callback(false)
			}
		})
	}

	// Tokens post
	// requires: phone, password
	handlers._tokens.post = function (data,callback){
		const phone        = typeof(data.payload.phone)        == 'string'  && data.payload.phone.trim().length == 10   ? data.payload.phone.trim()    : false;
		const password     = typeof(data.payload.password)     == 'string'  && data.payload.password.trim().length > 0  ? data.payload.password.trim() : false;
		if(phone && password){
			//lookup user matching that phone number
			_data.read('users',phone, function(err,userData){
				if(!err && userData) {
					//hash the sent password and compare it to the password stored in the user object
					const hashedPassword = helpers.hash(password);
					if(hashedPassword == userData.hashedPassword){
						//it's valid, create a new token with a random name, and expiry one hour in the future
						const tokenID = helpers.createRandomString(20); 
						const expires = Date.now()+(1000*60*60);
						const tokenObject = {
							'phone'  : phone,
							'id'     : tokenID,
							'expires': expires,
						};
						
						//store the toekn
						_data.create('tokens',tokenID,tokenObject,function(err){
							if(!err){
								callback(200,tokenObject);
							}else{
								callback(500,{"error":"could not create new token"});
							}
						});
					}else{
						callback(400,{'error':'passwords do not match'});
					}
				}else{
					callback(400, {'error': 'user not found'});
				}
			})
		} else {
			callback(400,{'error':'missing required fields'})
		}
	}

	// Tokens get
	//requires: id
	//optional: none
	handlers._tokens.get = function (data,callback){
		//check that the ID sent is valid
		const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
		if(id){
			//Lookup the id
			_data.read('tokens',id,function(err,tokenData){
				if(!err && tokenData){
					callback(200,tokenData);
				} else {
					callback(404)
				}
			})
		}else {
			callback(400, {'Error': 'Missing required field'});
		}
	}


	// Tokens put
	// requires: id, extend
	//optional: none
	handlers._tokens.put = function (data,callback){
		// check for the required field
		const id     = typeof(data.payload.id)        == 'string'   && data.payload.id.trim().length == 20   ? data.payload.id.trim()    : false;	
		const extend = typeof(data.payload.extend)    == 'boolean'  && data.payload.extend           == true ? true                      : false;
		if(id && extend){
			//lookup the token
			_data.read('tokens',id,function(err,tokenData){
				if(!err && tokenData){
					//check to make sure the token hasn't expired
					if(tokenData.expires > Date.now()){
						//set the expiration for an hour from now
						tokenData.expires = Date.now()+(1000*60*60);
						//persist new token data to disk
						_data.update('tokens',id,tokenData,function(err){
							if(!err){
								callback(200);
							} else {
								callback(500,{'Error':'Could not update token expiration'});
							}
						})
					} else{
						callback(400,{'error':'The token has expired and cannot be extended'});
					}
				} else{
					callback(500,{'Error':'specified token does not exist'});
				}
			})
		} else {
			callback(400,{'error':'missing required fields, or fields are invalid'});
		}
	}

	// Tokens delete
	// requires: id,
	//optional: none
	handlers._tokens.delete = function(data, callback){
		// check that the id is valid
		
		const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
		if(id){
			//Lookup the token
			_data.read('tokens',id,function(err,data){
				if(!err && data){
					_data.delete('tokens',id,function(err){
						if(!err){
							callback(200);
						}else{
							callback(500,{'Error':'Error deleting token'});
						}
					})
				} else {
					callback(400,{'Error':'Could not find specified token'});
				}
			})
		}else {
			callback(400, {'Error': 'Missing required field'});
		}
	}

// Checks
handlers.checks = (data, callback)=>{
	const acceptableMethods = ['post','get','put','delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._checks[data.method](data,callback);
	} else {
		callback(405);
	}
};

// Container for the checks submethods
handlers._checks = {};

// Checks - post
//requires: protocol, ulr, method, successCodes, timeoutSeconds
//optional: none
handlers._checks.post = function (data, callback){
	//Validate inputs
	const protocol       = typeof(data.payload.protocol)      == 'string'  
                      && ['http','https'].indexOf(data.payload.protocol) > -1
                                                                            ? data.payload.protocol       : false;
	const url            = typeof(data.payload.url)           == 'string'
	                    && data.payload.url.trim().length      > 0
	                                                                          ? data.payload.url            : false;
	const method         = typeof(data.payload.method)        == 'string'
	                    && ['post','get','put','delete'].indexOf(data.payload.method)  >-1 
	                                                                          ? data.payload.method         : false;
	const successCodes    = typeof(data.payload.successCodes)   == 'object'
	                    && data.payload.successCodes    instanceof Array 
	                    && data.payload.successCodes.length      > 0 
	                                                                          ? data.payload.successCodes    : false;
	const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number'
	                    && data.payload.timeoutSeconds % 1    === 0 
	                    && data.payload.timeoutSeconds         >= 1
	                    && data.payload.timeoutSeconds         <= 5
	                    															                        ? data.payload.timeoutSeconds : false;
  
 	if(protocol && url && method && successCodes && timeoutSeconds){

		// Get the token from the headers
		const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		// lookup the user by reading the token
		
		
		_data.read('tokens',token,function(err,tokenData){

			if( !err & typeof(tokenData)=='object' ){
				const userPhone = tokenData.phone;

				//Lookup the user data 
				_data.read('users',userPhone,function(err,userData){

					if(!err && userData){
 						const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
 						// verify that the user has less than the number of max checks per user
 						if(userChecks.length < config.maxChecks){
 							// create a random id for the check
 							const checkID =  helpers.createRandomString(20);

 							//create the check objects and include the user's phone numbber
 							const checkObject = {
									'id'            : checkID,
									'userPhone'     : userPhone,
									'protocol'      : protocol,
									'url'           : url,
									'method'        : method,
									'successCodes'   : successCodes,
									'timeoutSeconds': timeoutSeconds,
 							};
 							_data.create('checks',checkID,checkObject,function(err){
 								if(!err){
 									//add the checkID to the user's object
 									userData.checks = userChecks;
 									userData.checks.push(checkID);

 									//save the new user data
 									_data.update('users',userPhone,userData,function(err){
 										if(!err){
 											//return the data about the new check to the user
 											callback(200,checkObject);
 										} else {
 											callback(500,{'error':'could not update user with new check'})
 										}
 									})

 								} else {
 									callback(500, {'error':'could not create new check'})
 								}
 							})

 						} else {
 							callback(400,{'error':'Maximum number of checks reached. ('+config.maxChecks+')'});
 						}
					} else {
						callback(403)
					}
				})
			} else {
				callback(403)
			}
		})

	} else {
		callback(400, {'Error':'Missing required fields or inputs are invalid'});
	}
}

// Checks - Get
//requires: id
//optional: none
handlers._checks.get = function(data, callback){
		// check that the phone number is valid
		const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
		if(id){
			//lookup the check
			_data.read('checks',id,function(err,checkData){
				if(!err && checkData){

				// Get the token from the headers
				const token = typeof(data.queryStringObject.token) == 'string' && data.queryStringObject.token.trim().length == 20 ? data.queryStringObject.token.trim() : false;
				// Verify that the given token is valid  and belongs to the user who created the check
				handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
					if(tokenIsValid){
					
					//return the check data
					callback(200,checkData);

					} else {
						callback(403);
					}
				});

					} else {
						callback(400,{'error':'specified check not found'});
					}
				});

		}else {
			callback(400, {'Error': 'Missing required field'});
		}
	}

// Checks - PUT 
//requires: id
//optional: protocol, url, method, successCodes, timeoutSeconds (At least one required);
handlers._checks.put = function(data, callback){
	// check for the required field
	const id        = typeof(data.payload.id)        == 'string'  && data.payload.id.trim().length == 20   ? data.payload.id.trim()    : false;	
	// check for optional fields
	const protocol       = typeof(data.payload.protocol)      == 'string'  
                    && ['http','https'].indexOf(data.payload.protocol) > -1
                                                                          ? data.payload.protocol       : false;
	const url            = typeof(data.payload.url)           == 'string'
	                    && data.payload.url.trim().length      > 0
	                                                                          ? data.payload.url            : false;
	const method         = typeof(data.payload.method)        == 'string'
	                    && ['post','get','put','delete'].indexOf(data.payload.method)  >-1 
	                                                                          ? data.payload.method         : false;
	const successCodes    = typeof(data.payload.successCodes)   == 'object'
	                    && data.payload.successCodes    instanceof Array 
	                    && data.payload.successCodes.length      > 0 
	                                                                          ? data.payload.successCodes    : false;
	const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number'
	                    && data.payload.timeoutSeconds % 1    === 0 
	                    && data.payload.timeoutSeconds         >= 1
	                    && data.payload.timeoutSeconds         <= 5
	                    															                        ? data.payload.timeoutSeconds : false;

	// check to make sure id is valid.
	if(id){
		// Check to make sure one or more optional fields has been sent.
		if(protocol || url || method || successCodes || timeoutSeconds){
			//Lookup the check
			_data.read('checks',id,function(err,checkData){
				if(!err && checkData){

					// Get the token from the headers
					const token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;
					// Verify that the given token is valid  and belongs to the user who created the check

					handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){

						if(tokenIsValid){
							
							//update the check where nessicary
							if(protocol){checkData.protocol = protocol};
							if(url){checkData.url = url};
							if(method){checkData.method = method};
							if(successCodes){checkData.successCodes = successCodes};
							if(timeoutSeconds){checkData.timeoutSeconds = timeoutSeconds}; 

							//store the updates
							_data.update('checks',id,checkData,function(err){
								if(!err){
									callback(200);
								} else {
									callback(500,{'error':'Unable to update checkData on disk'});
								}
							});
						} else{
							callback(403);
						}
					})
				} else {
					callback(400,{'Error':'Check ID did not exist'});
				}
			});
		} else {
			callback(400,{'Error':'Must specify at least one field to update'});
		}
	} else {
		callback(400,{'Error': 'Missing required field'})
	}                 															                     
};


//export the module
module.exports = handlers;
