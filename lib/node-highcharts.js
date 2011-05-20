var jsdom = require('jsdom'),
	spawn	= require('child_process').spawn;
// jsdom.defaultDocumentFeatures = {
//   FetchExternalResources   : ['script'], 
//   ProcessExternalResources : true, // <== make sure it's true!
//   MutationEvents           : false,
//   QuerySelector            : false
// }
// ;


function createHighchartsWindow(callback) {
// 		console.log(jsdom.defaultDocumentFeatures.FetchExternalResources);
// jsdom.defaultDocumentFeatures.ProcessExternalResources = true;
// 		console.log(jsdom.defaultDocumentFeatures.ProcessExternalResources);

	jsdom.env('<html><head></head><body></body></html>', ['jquery-1.4.2.min.js', 'highcharts/highcharts.src.js'], function (errors, window){
		
		// Convince Highcharts that our window supports SVG's
		window.SVGAngle = true;
		
		// jsdom doesn't yet support createElementNS, so just fake it up
		window.document.createElementNS = function(ns, tagName) {
			var elem = window.document.createElement(tagName);	
			elem.getBBox = function() {
				return {
					x: elem.offsetLeft,
					y: elem.offsetTop,
					width: elem.offsetWidth,
					height: elem.offsetHeight
				};
			};
			return elem;
		};
		
		callback(window);

// 		console.log(window.jQuery ? "jquery" : "noQ");
// 		console.log(window.Highcharts ? "hs" : "nohs");
		
		

	});
	
	return;

	var window 	= jsdom.jsdom().createWindow(),
		script	= window.document.createElement('script');
	
	// Convince Highcharts that our window supports SVG's
	window.SVGAngle = true;
	
	// jsdom doesn't yet support createElementNS, so just fake it up
	window.document.createElementNS = function(ns, tagName) {
		var elem = doc.createElement(tagName);	
		elem.getBBox = function() {
			return {
				x: elem.offsetLeft,
				y: elem.offsetTop,
				width: elem.offsetWidth,
				height: elem.offsetHeight
			};
		};
		return elem;
	};
	
	// Load scripts
	jsdom.jQueryify(window,'jquery-1.4.2.min.js', function(w,jq) {
		script.src = 'file://'+__dirname + '/highcharts/highcharts.src.js';
		console.log('ggg');
		console.log(script.src);
		script.onload = function() {
			console.log('sss');
			if (this.readyState === 'complete') {
				callback(window);
			}
		}
	});
}

function render(options, completed) {
	createHighchartsWindow(function(window) {

		var $	= window.jQuery,
			Highcharts 	= window.Highcharts,
			document	= window.document,
			$container	= $('<div id="container" />'),
			chart, svg, convert, buffer;
		
		$container.appendTo(document.body);
		
		chart = new Highcharts.Chart(options);
		
		svg = $container.children().html();
		
		// Start convert
		convert	= spawn('convert', ['svg:-', 'png:-']);

		// Pump in the svg content
		convert.stdin.write(svg);
		convert.stdin.end();
		
		// Write the output of convert straight to the response
		convert.stdout.on('data', function(data) {
			var prevBufferLength = (buffer ? buffer.length : 0),
				newBuffer = new Buffer(prevBufferLength + data.length);
				
			if (buffer) {
				buffer.copy(newBuffer, 0, 0);
			}
			
			data.copy(newBuffer, prevBufferLength, 0);
			
			buffer = newBuffer;
		});
		
		// When we're done, we're done
		convert.on('exit', function(code) {
			completed(buffer);
		});
	});
}

exports.render = render;
