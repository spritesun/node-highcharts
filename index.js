var http	= require('http'),
	parse	= require('url').parse,
	spawn	= require('child_process').spawn,
  fs = require('fs'),
	jsdom	= require('jsdom');
	
var map = function(arr, func) {
	var i,
		results = [];
	
	for (i = 0; i < arr.length; i++) {
		results.push(func.apply(arr[i], [i]));
	}
	
	return results;
}

var createHighchartsWindow = function(fn) {
  jsdom.env('<html><head></head><body></body></html>', ['lib/jquery-1.4.2.min.js', 'lib/highcharts/highcharts.src.js'], function (errors, window){
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
    fn(window);
  });
};

this.server = http.createServer(function(request, response) {
	console.log("request");
	var url 		= parse(request.url, true),
		chartTypeMatch 	= /^\/(\w+)$/.exec(url.pathname),
		chartType	= chartTypeMatch ? chartTypeMatch[1] : null,
		query		= (url.query || {}),
		width		= query.width || 640,
		height		= query.height || 480,
		data		= [];
    custom  = query.custom;    
	if (query.data) {
		map(query.data.split(','), function(i) {
			data.push(parseFloat(this));
		});
	}
	createHighchartsWindow(function(window) {
		var $	= window.jQuery,
			Highcharts 	= window.Highcharts,
			document	= window.document,
			$container	= $('<div id="container" />'),
			chart, svg, convert;
		
		$container.appendTo(document.body);
    // Generate a chart from a custom JSON object 
    if(custom) {
      customChart = $.parseJSON(custom);
      customChart.chart.renderTo = $container[0];
      customChart.chart.renderer = 'SVG';
      chart = new Highcharts.Chart(customChart);
    }
    // Generate a chart from data provided
    if(data.length > 0) {	
      chart = new Highcharts.Chart({
        chart: {
          defaultSeriesType: chartType,
          renderTo: $container[0],
          renderer: 'SVG',
          width: width,
          height: height
        },
        series: [{
          data: data
        }]
      });
	  }	
    svg = $container.children().html();
  	// Generate SVG - just for debugging 
    //fs.writeFile('chart.svg', svg, function() { console.log('done'); });	
		// Start convert
		convert	= spawn('convert', ['svg:-', 'png:-']);

		// We're writing an image, hopefully...
		response.writeHeader(200, {'Content-Type': 'image/png'});
		
		// Pump in the svg content
		console.log(svg);
    convert.stdin.write(svg);
		convert.stdin.end();
		
		// Write the output of convert straight to the response
		convert.stdout.on('data', function(data) {
			response.write(data);
		});

		// When we're done, we're done
		convert.on('exit', function(code) {
			response.end();	
		});
	});
	
}).listen(2308);

console.log('listening on 2308');
