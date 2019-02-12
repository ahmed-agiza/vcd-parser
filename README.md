# vcd-parser

A Node.js parsing tool for Value Change Dump (VCD) files and generating a readble JSON document. It can be used with different hardware simulation tools such as [Icarus Iverilog](http://iverilog.icarus.com).

## Installation

`npm install --save vcd-parser`

## Usage example

```javascript
const VCDParser = require('vcd-parser');
VCDParser.parse(
	`
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
`
)
	.then(parsedData => {
		console.log(parsedData);
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
	})
	.catch(err => {
		console.error(err);
	});
```

## API Documentation

-   [VCDParser](#VCDParser) :
    -   [.parse(content, [opts], [cb])](#VCDParser..parse) ⇒ [<code>Promise.&lt;ParsedData&gt;</code>](#VCDParser..ParsedData)

<a name="VCDParser..parse"></a>

### VCDParser.parse(content, [opts], [cb]) ⇒ [<code>Promise.&lt;ParsedData&gt;</code>](#VCDParser..ParsedData)

Parse VCD text content and generate a valid JSON representation.
The function returns a promise unless a callback is provided.

**Returns**: [<code>Promise.&lt;ParsedData&gt;</code>](#VCDParser..ParsedData) - that resolves with the parsed data

| Param   | Type                                                    | Default         | Description                                             |
| ------- | ------------------------------------------------------- | --------------- | ------------------------------------------------------- |
| content | <code>string</code>                                     |                 | The text content of the VCD file                        |
| [opts]  | [<code>Options</code>](#VCDParser..Options)             | <code>{}</code> | Optional configuration to customize the parsing process |
| [cb]    | [<code>ParseCallback</code>](#VCDParser..ParseCallback) | <code></code>   | Optional callback if you don't prefer to use promises   |

<a name="VCDParser..Options"></a>

### VCDParser:Options : <code>Object</code>

The optional configuration for the VCD parser

**Properties**

| Name              | Type                 | Description                                               |
| ----------------- | -------------------- | --------------------------------------------------------- |
| compress          | <code>boolean</code> | Compress the output wave by ignoring the unchanged values |
| expandAmbigousBus | <code>boolean</code> | If the bus has some ambigous value (z                     | x), it gets expanded to represent the whole bus signal |

<a name="VCDParser..SignalValue"></a>

### VCDParser:SignalValue : <code>Array.&lt;number&gt;</code>

The value of a signal at a specific point of time, represnted as a tuple [time, value]

**Properties**

| Name | Type                | Description                           |
| ---- | ------------------- | ------------------------------------- |
| 0    | <code>number</code> | The time of the event                 |
| 1    | <code>number</code> | The value of the signal at that event |

<a name="VCDParser..Signal"></a>

### VCDParser:Signal : <code>Object</code>

The object representing one signal data

**Properties**

| Name    | Type                                                              | Description                                              |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| name    | <code>string</code>                                               | The full name of the signal                              |
| type    | <code>string</code>                                               | The type of the signal, e.g. wire, reg,..etc             |
| size    | <code>number</code>                                               | The size/width of the signal in bits                     |
| refName | <code>string</code>                                               | The reference for this signal used inside the VCD file   |
| module  | <code>string</code>                                               | The name of the top module for which this signal belongs |
| wave    | [<code>Array.&lt;SignalValue&gt;</code>](#VCDParser..SignalValue) | The values of the signal at different points of time     |

<a name="VCDParser..ParsedData"></a>

### VCDParser:ParsedData : <code>Object</code>

The parsed VCD object generated by the parser

**Properties**

| Name      | Type                                                    | Description                                                          |
| --------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| [...meta] | <code>string</code>                                     | The values of different initial meta-data, e.g. date, timescale..etc |
| endtime   | <code>string</code>                                     | The endtime of the simulation                                        |
| scale     | <code>string</code>                                     | The time-scale unit of the simulation                                |
| signal    | [<code>Array.&lt;Signal&gt;</code>](#VCDParser..Signal) | The signal values of the simulation                                  |

<a name="VCDParser..ParseCallback"></a>

### VCDParser:ParseCallback : <code>function</code>

The callback for the parsing function.

| Param      | Type                    | Description                               |
| ---------- | ----------------------- | ----------------------------------------- |
| err        | <code>error</code>      | The error generated while parsing         |
| parsedJSON | <code>ParsedData</code> | The JSON document generated by the parser |
