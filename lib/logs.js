// Library for storing and rotating logs

// dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module
const lib = {};

 // base directory of the data folder
lib.baseDir = path.join(__dirname,'/../.logs/');


// Append a string to a file, create the file if it does not exist.
lib.append = function(file, str, callback){
	// open the file for apending.
	fs.open(lib.baseDir+file+'.log','a',function(err,fileDescriptor){
		if(!err && fileDescriptor){
			fs.appendFile(fileDescriptor,str+'\n',function(err){
				if(!err){
					fs.close(fileDescriptor,function(err){
						if(!err){
							callback(false);
						} else {
							callback('error closing logfile being appended')
						}
					})
				} else{
					 callback('Error appening to logfile');
				}
			})
		} else {
			callback('could not open file for appending');
		}
	});
}

// list all the logs and optionaly include all the compressed logs
lib.list = function(includeCompressedLogs,callback) {
	fs.readdir(lib.baseDir,function(err,data){
		if(!err && data){
			const trimmedFileNames = [];
			data.forEach(function(filename){
				// add the .log files
				if(filename.indexOf('.log' > -1)){
					trimmedFileNames.push(filename.replace('.log',''));
				}

				// add on the .gz files
				
				if(filename.indexOf('.gz.b64') > -1 && includeCompressedLogs){
					trimmedFileNames.push(filename.replace('.gz.b64',''));	
				}
			});
			callback(false,trimmedFileNames);
		} else {
			callback('could not open the file for appending');
		}
	})
}

//compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = function(logId,newFileId,callback){
	const sourcefile = logId+'.log';
	const destFile = newFileId+'.gz.b64';

	// read the source file
	fs.readFile(lib.baseDir+sourcefile,'utf8',function(err,inputString){
		if(!err){
			// compres the data	 using gzip
			zlib.gzip(inputString,function(err,buffer){
				if(!err && buffer){
					//Send the data to the destination file
					fs.open(lib.baseDir+destFile,'wx',function(err,fileDescriptor){
						if(!err && fileDescriptor){
							fs.writeFile(fileDescriptor,buffer.toString('base64'), function(err){
								if(!err){
									//close the destfile
									fs.close(fileDescriptor, function(err){
										if(!err){
											callback(false);
										} else {
											callback(err);
										}
									});
								} else {
									callback(err);
								}
							})
						} else {
							callback(err);
						}
					})
				} else {
					callback(err);
				}
			} );
		} else{
			callback(err);
		}
	});
}


//Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = function(fileID,callback){
	const fileName = fileID+'.gz.b64';
	fs.readFile(lib.baseDir+fileName,'utf8', function(err,string){
		if(!err && string){
			//Decompress the data
			let inputBuffer = new Buffer.from(string,'base64');
			zlib.unzip(inputBuffer, function(err,outputBuffer){
				if(!err && outputBuffer){
					// callback
					const str = outputBuffer.toString();
					callback(false,str);
				} else {
					callback(err);
				}
			});
		} else {
			callback(err);
		}
	});
}

// Truncate a logfile
lib.truncate = function(logId,callback){
	fs.truncate(lib.baseDir+logId+'.log',0,function(err){
		if(!err){
			callback(false);
		} else {
			callback(err);
		}
	})
}


// export the module
module.exports = lib;