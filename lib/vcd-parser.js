/**
 * A namespace.
 * @namespace VCDParser
 */

const async = require('async');
const { extend } = require('./utils');

/**
 * Parse VCD text content and generate a valid JSON representation.
 * The function returns a promise unless a callback is provided.
 * @name VCDParser~parse
 * @function
 * @param {string} content - The text content of the VCD file
 * @param {VCDParser~Options} [opts = {}] - Optional configuration to customize the parsing process
 * @param {VCDParser~ParseCallback} [cb = null] - Optional callback if you don't prefer to use promises
 * @return {Promise<VCDParser~ParsedData>} Promise object that resolves with the parsed data
 * @example
 * const VCDParser = require('vcd-parser');
 * VCDParser.parse(`
	$date
	Tue Feb 12 14:01:15 2019
	$end
	$version
	Icarus Verilog
	$end
	$timescale
	1ns
	$end
	$scope module test_tb $end
	$var reg 1 ! clk $end
	$var wire 1 " rst $end
	$upscope $end
	$enddefinitions $end
	#0
	$dumpvars
	0"
	0!
	$end
	#15
	1"
	#20
	1!
	#40
	0!
	#60
	1!
	#80
	0!
	#100
	1!
	#115
`).then(parsedData => {
 *	console.log(parsedData);
// {
// 	"date": "Tue Feb 12 14:01:15 2019",
// 	"version": "Icarus Verilog",
// 	"timescale": "1ns",
// 	"endtime": "115",
// 	"scale": "1ns",
// 	"signal": [
// 		{
// 			"type": "reg",
// 			"size": 1,
// 			"refName": "!",
// 			"signalName": "clk",
// 			"module": "test_tb",
// 			"name": "test_tb.clk",
// 			"wave": [
// 				[
// 					"0",
// 					"0"
// 				],
// 				[
// 					"20",
// 					"1"
// 				],
// 				[
// 					"40",
// 					"0"
// 				],
// 				[
// 					"60",
// 					"1"
// 				],
// 				[
// 					"80",
// 					"0"
// 				],
// 				[
// 					"100",
// 					"1"
// 				]
// 			]
// 		},
// 		{
// 			"type": "wire",
// 			"size": 1,
// 			"refName": "\"",
// 			"signalName": "rst",
// 			"module": "test_tb",
// 			"name": "test_tb.rst",
// 			"wave": [
// 				[
// 					"0",
// 					"0"
// 				],
// 				[
// 					"15",
// 					"1"
// 				]
// 			]
// 		}
// 	]
// }
 * }).catch(err => {
 *	console.error(err);
 * }).
 */
const parse = (content, opts = {}, cb) => {
	if (typeof opts === 'function') {
		cb = opts;
		opts = {};
	}
	const wrappedCallback = () => {
		if (typeof cb !== 'function') {
			return null;
		}
		return function() {
			return cb(null, ...arguments);
		};
	};
	return new Promise((resolve, reject) => {
		setTimeout(function() {
			process.nextTick(function() {
				const blocks = content
					.split(/\s*\$end\s/gm)
					.map(line => line.replace(/[\n\t]/gm, ' '));
				const States = {
					Init: 0,
					Meta: 1,
					Def: 2,
					Dump: 3
				};
				let modules = [];
				const meta = {};
				const signals = [];
				const signalMap = {};
				let lastIndex;
				for (let i = 0; i < blocks.length; i++) {
					const block = blocks[i].trim();
					if (block === '') {
						continue;
					}

					const scopeMatches = /\$(\w+?)\b/gm.exec(block);
					if (scopeMatches) {
						const scopeName = scopeMatches[1];
						if (scopeName === 'scope') {
							state = States.Def;
							const scopeDefMatches = /\$(\w+)\s+([\s\S]+)\s+([\s\S]+)/gm.exec(
								block
							);
							if (!scopeDefMatches) {
								return reject({
									error: 'Invalid VCD data'
								});
							}
							const modName = scopeDefMatches[3];
							modules.push(modName);
						} else if (scopeName === 'enddefinitions') {
							state = States.Dump;
							lastIndex = i + 1;
							break;
						} else if (scopeName === 'upscope') {
							modules.pop();
						} else if (scopeName === 'var') {
							const varDefMatches = /\$(\w+)\s+([\s\S]+?)\s+(\d+)\s+([\s\S]+?)\s+([\s\S]+)\s*/gm.exec(
								block
							);
							const signalName = varDefMatches[5].replace(
								/\s+/,
								''
							);
							const refName = varDefMatches[4];
							if (!signalMap[refName]) {
								const signal = {
									type: varDefMatches[2],
									size: parseInt(varDefMatches[3]),
									refName,
									signalName,
									module: modules[modules.length - 1] || '',
									name: modules.concat(signalName).join('.'),
									wave: []
								};
								signals.push(signal);
								signalMap[refName] = signal;
							}
						} else {
							const contentMatches = /\$(\w+)\b\s*([\s\S]+)?\s*/gm.exec(
								block
							);
							if (contentMatches) {
								meta[contentMatches[1]] = contentMatches[2];
							}
						}
					} else {
						return reject({
							error: 'Invalid VCD data'
						});
					}
				}
				if (!lastIndex) {
					return reject({
						error: 'Invalid VCD data'
					});
				}
				let currentTime = 0;
				const rem = content.split(/\s*\$enddefinitions\s*/gm)[1];
				if (!rem) {
					return reject({
						error: 'Invalid VCD data'
					});
				}
				const lines = rem.split(/\s*\n\s*/gm);
				async.eachSeries(
					lines,
					function(line, callback) {
						(function(line) {
							setTimeout(function() {
								const block = line.trim();
								if (block === '') {
									return callback();
								}
								const timingMatches = /^#(\d+)$/gm.exec(block);
								if (timingMatches) {
									const time = parseInt(timingMatches[1]);
									currentTime = time;
								} else if (block === '$dumpvars') {
									return callback();
								} else if (block === '$end') {
									return callback();
								} else {
									if (block.startsWith('x')) {
										const refName = block.substr(1).trim();
										if (!signalMap[refName]) {
											return callback({
												error: 'Invalid VCD data'
											});
										}
										const wave = signalMap[refName].wave;
										if (
											!opts.compress ||
											!wave.length ||
											wave[wave.length - 1][1] !== 'x'
										) {
											signalMap[refName].wave.push([
												currentTime.toString(),
												'x'
											]);
										}
									} else if (block.startsWith('b')) {
										const matches = /b([01xz]+)\s+([\s\S]+)/gm.exec(
											block
										);
										if (!matches) {
											return callback({
												error: 'Invalid VCD data'
											});
										}
										const refName = matches[2];
										if (!signalMap[refName]) {
											return callback({
												error: 'Invalid VCD data'
											});
										}
										let value = matches[1];
										if (!opts.expandAmbigousBus) {
											if (/z/gm.test(value)) {
												value = 'z';
											} else if (/x/gm.test(value)) {
												value = 'x';
											}
										}
										const wave = signalMap[refName].wave;
										if (
											!opts.compress ||
											!wave.length ||
											wave[wave.length - 1][1] !== value
										) {
											signalMap[refName].wave.push([
												currentTime.toString(),
												value
											]);
										}
									} else if (block.startsWith('z')) {
										const refName = block.substr(1).trim();
										if (!signalMap[refName]) {
											return callback({
												error: 'Invalid VCD data'
											});
										}
										const wave = signalMap[refName].wave;
										if (
											!opts.compress ||
											!wave.length ||
											wave[wave.length - 1][1] !== 'z'
										) {
											signalMap[refName].wave.push([
												currentTime.toString(),
												'z'
											]);
										}
									} else if (/^[01]([\s\S]+)/gm.test(block)) {
										const matches = /^([01])([\s\S]+)/gm.exec(
											block
										);
										const refName = matches[2];
										if (!signalMap[refName]) {
											return callback({
												error: 'Invalid VCD data'
											});
										}
										const converted = parseInt(
											matches[1],
											10
										).toString(2);
										const wave = signalMap[refName].wave;
										if (
											!opts.compress ||
											!wave.length ||
											wave[wave.length - 1][1] !==
												converted
										) {
											signalMap[refName].wave.push([
												currentTime.toString(),
												converted
											]);
										}
									} else if (block.startsWith('r')) {
										const matches = /r((\d+\.?\d*)|(nan)|(x+)|(z+))\s+([\s\S]+)/gm.exec(
											block
										);
										if (!matches) {
											return callback({
												error: 'Invalid VCD data'
											});
										}
										let value;
										if (
											matches[1] === 'nan' ||
											matches[1].charAt(0) === 'x'
										) {
											value = 'x';
										} else if (
											matches[1].charAt(0) === 'z'
										) {
											value = 'z';
										} else {
											value = parseFloat(matches[1]);
										}
										const refName = matches[6];
										if (!signalMap[refName]) {
											return callback({
												error: 'Invalid VCD data'
											});
										}
										const wave = signalMap[refName].wave;
										if (
											!opts.compress ||
											!wave.length ||
											wave[wave.length - 1][1] !==
												converted
										) {
											signalMap[refName].wave.push([
												currentTime.toString(),
												isNaN(value)
													? 'x'
													: value.toString()
											]);
										}
									} else {
										return callback({
											error: 'Invalid VCD data'
										});
									}
								}
								return callback();
							}, 0);
						})(line);
					},
					function(err) {
						if (err) {
							return reject(err);
						}
						meta.endtime = currentTime.toString();
						meta.scale = meta.timescale;
						return resolve(
							extend({}, meta, {
								signal: signals
							})
						);
					}
				);
			});
		}, 0);
	})
		.then(wrappedCallback())
		.catch(cb);
};

/**
 * The optional configuration for the VCD parser
 * @typedef {Object} VCDParser~Options
 * @property {boolean} compress - Compress the output wave by ignoring the unchanged values
 * @property {boolean} expandAmbigousBus - If the bus has some ambigous value (z | x), it gets expanded to represent the whole bus signal
 */

/**
 * The value of a signal at a specific point of time, represnted as a tuple [time, value]
 * @typedef {Array<number>} VCDParser~SignalValue
 * @property {number} 0 - The time of the event
 * @property {number} 1 - The value of the signal at that event
 */

/**
 * The object representing one signal data
 * @typedef {Object} VCDParser~Signal
 * @property {string} name - The full name of the signal
 * @property {string} type - The type of the signal, e.g. wire, reg,..etc
 * @property {number} size - The size/width of the signal in bits
 * @property {string} refName - The reference for this signal used inside the VCD file
 * @property {string} module - The name of the top module for which this signal belongs
 * @property {Array<VCDParser~SignalValue>} wave - The values of the signal at different points of time
 */

/**
 * The parsed VCD object generated by the parser
 * @typedef {Object} VCDParser~ParsedData
 * @property {string} [<"meta">] - The values of different initial meta-data, e.g. date, timescale..etc
 * @property {string} endtime - The endtime of the simulation
 * @property {string} scale - The time-scale unit of the simulation
 * @property {Array<VCDParser~Signal>} signal - The signal values of the simulation
 */

/**
 * The callback for the parsing function.
 * @callback VCDParser~ParseCallback
 * @param {error} err - The error generated while parsing
 * @param {ParsedData} parsedJSON - The JSON document generated by the parser
 */

module.exports = { parse };
