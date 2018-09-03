// create and export configuration variables

// container for all the environments
const environments = {

};


// staging (defaule entrionments)
environments.staging = {
	envName : 'staging',
	'httpPort' : 3000,
	'httpsPort':3001,
	hashingSecret: 'thisIsASecret',
};


// production envrionment;
environments.production = {
	'envName': 'production',
	'httpPort' : 5000,
	'httpsPort':5001,
	hashingSecret: 'thisIsAlsoASecret',
};

console.log('NODE_ENV: ',process.env.NODE_ENV,)

//determine with environment was passed as a command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// check that the current environmen tis one of the environments above, if not, default to staging;
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;


//export the module

module.exports = environmentToExport;