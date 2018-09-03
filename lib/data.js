//
// Library for storing and edit data



// Dependencies
const fs      = require('fs'); //Node file system module
const path    = require('path'); //node path module, will be used to 'normalize the paths' to files.
const helpers = require('./helpers');

// container for the module (to be exported)
const lib = {}

 // base directory of the data folder
lib.baseDir = path.join(__dirname,'/../.data/')

//Write data to a file
lib.create = (dir, file, data, callback) =>{
	// open the file for writing
	fs.open(lib.baseDir+dir+'/'+file+'.json','wx',function(err,fileDescriptor){
		if(!err && fileDescriptor){
			//convert data to a string
			const stringData = JSON.stringify(data);

			// Write to file and close file
			fs.writeFile(fileDescriptor, stringData, function(err){
				if(!err){
					fs.close(fileDescriptor,function(err){
						if(!err){
							callback(false);
						} else {
							callback('error closing new file');
						}
					});
				}else{
					callback('error writing to new file.');
				}
			});
		} else{
			callback('Could not create a new file, it may already exist\n'+err);
		}
	});
}

// Read data from a file
lib.read = function(dir,file,callback) {
	fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf8',function(err,data){
		if(!err && data){
			const parsedData = helpers.parseJsonToObject(data);
			callback(false,parsedData);
		} else {
		callback(err,data);
		}
	});
}

// update data in an existing file
lib.update = function(dir, file, data,callback){
	//open the file for writing
	fs.open(lib.baseDir+dir+'/'+file+'.json','r+',function(err,fileDescriptor){
		if(!err && fileDescriptor){
			//convert data to a string
			const stringData = JSON.stringify(data);

			// truncate contents of file
			fs.ftruncate(fileDescriptor,function(err){
				if(!err){
					//write to file and close it
					fs.writeFile(fileDescriptor, stringData,function(err){
						if(!err){
							fs.close(fileDescriptor,function(err){
								if(!err){
									callback(false);
								} else {
									callback('error closing existing file');
								}
							});
						} else {
							callback('error writing to existing file');
						}
					})
				} else {
					callback('error truncating file');
				}
			})
		} else {
			callback('could not open the file for updating, it may not exist yet');
		}
	})
};

//delete a file
lib.delete = function(dir,file,callback){
	//unlink the file
	fs.unlink(lib.baseDir+dir+'/'+file+'.json',function(err){
		if(!err){
			callback('false');
		} else {
			callback('Error deleting file');
		}
	})
}


//Export module
module.exports = lib;
