// Dependencies
const secure = require('./secureData');

// create and export configuration variables

// container for all the environments
const environments = {};

// staging (defaule entrionments)
environments.staging = {
	envName      : 'staging',
	'httpPort'   : 3000,
	'httpsPort'  : 3001,
	hashingSecret: 'thisIsASecret',
	maxChecks    : 5,
	'twilio'     : {
		'accountSID' : secure.twilioTest.accountSID,
		'authToken'  : secure.twilioTest.authToken,
		'fromPhone'  : secure.twilioTest.fromPhone,
	},
	'templateGlobals' :{
		'appName' : 'UptimeChecker',
		'companyName' : 'NotARealCompany, Inc',
		'yearCreated' : '2018',
		'baseUrl' : 'http://localhost:3000/'
	}
};


// production envrionment;
environments.production = {
	'envName'    : 'production',
	'httpPort'   : 5000,
	'httpsPort'  : 5001,
	hashingSecret: 'thisIsAlsoASecret',
	maxChecks    : 5,
	'twilio'     : {
		'accountSID' : secure.twilio.accountSID,
		'authToken'  : secure.twilio.authToken,
		'fromPhone'  : secure.twilio.fromPhone,
	},
	'templateGlobals' :{
		'appName' : 'UptimeChecker',
		'companyName' : 'NotARealCompany, Inc',
		'yearCreated' : '2018',
		'baseUrl' : 'http://localhost:5000/'
	}
};





//determine with environment was passed as a command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// check that the current environmen tis one of the environments above, if not, default to staging;
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;


//export the module

module.exports = environmentToExport;