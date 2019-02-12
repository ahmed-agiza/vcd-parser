/**
 * Simple example file
 */
const fs = require('fs');
const path = require('path');
const util = require('util');
const VCDParser = require('..');

const readFile = util.promisify(fs.readFile);

readFile(path.join(__dirname, 'sample.small.vcd'), 'utf8')
	.then(content => {
		return VCDParser.parse(content);
	})
	.then(parsedContent => {
		console.log(parsedContent);
	})
	.catch(err => {
		console.error(err);
	});
