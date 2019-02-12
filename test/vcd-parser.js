const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const util = require('util');
const VCDParser = require('..');

const readFile = util.promisify(fs.readFile);

describe('vcd-parser', function() {
	it('should properly parse VCD file', function(done) {
		readFile(path.join(__dirname, 'sample.vcd'), 'utf8')
			.then(content => {
				return VCDParser.parse(content);
			})
			.then(parsedVCD => {
				expect(parsedVCD).to.be.an('object');
				expect(parsedVCD).to.have.property('date');
				expect(parsedVCD.date).to.be.a('string');
				expect(parsedVCD).to.have.property('version');
				expect(parsedVCD.version).to.be.a('string');
				expect(parsedVCD).to.have.property('endtime');
				expect(parsedVCD.endtime).to.be.a('string');
				expect(isNaN(parseFloat(parsedVCD.endtime))).to.be.false;
				expect(parsedVCD).to.have.property('scale');
				expect(parsedVCD.scale).to.be.a('string');
				expect(parsedVCD.signal).to.be.an('array');
				parsedVCD.signal.forEach(s => {
					expect(s).to.be.an('object');
					expect(s).to.have.property('type');
					expect(s).to.have.property('size');
					expect(s).to.have.property('refName');
					expect(s).to.have.property('signalName');
					expect(s).to.have.property('module');
					expect(s).to.have.property('name');
					expect(s).to.have.property('wave');
					expect(s.wave).to.be.an('array');
					s.wave.forEach(w => expect(w).to.have.a.lengthOf(2));
				});
				done();
			})
			.catch(done);
	});
});
