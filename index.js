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
  var url = parse(request.url, true),
    query = (url.query || {});
  
  createHighchartsWindow(function(window) {
	  var $	= window.jQuery,
			Highcharts 	= window.Highcharts,
			document	= window.document,
			$container	= $('<div id="container" />'),
			chart, svg, convert, chartDefinition;
    
    if (query.chart) {
      chartDefinition  = query.chart;    
    }
    if (query.url) {
      //$.get(query.url, function(data) {
      //$.ajax({ url: 'rjstatic.me/highchart.json', success: function(data) {
      //  chartDefinition = data;
      //}});
      var options = {
        host: 'www.rjstatic.me',
        port: 80,
        path: "/" + query.url 
      };

      http.get(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          chartDefinition = chunk;
          console.log('BODY: ' + chunk);
          ChartRender();  
          /* try {
            console.log('trying');
            var chartObject = JSON.parse(chartDefinition);
            if (chartObject.results.length > 0) {
              render();
            }
          }
          catch (err) {
            console.log('still waiting...');  
          }
          */
        });
        //res.on('end', function (chunk) {
          //render();
          //console.log(chartDefinition);	
        //});

        console.log("Got response: " + res.statusCode);
      }).on('error', function(e) {
        console.log("Got error: " + e.message);
      });    
    }
    function ChartRender() {
      console.log('Render started');
      console.log(chartDefinition);	
      if(!chartDefinition) {
        response.end();
      }
      $container.appendTo(document.body);
      chartObject = $.parseJSON(chartDefinition);
      chartObject.chart.renderTo = $container[0];
      chartObject.chart.renderer = 'SVG';
      chart = new Highcharts.Chart(chartObject);
      
      svg = $container.children().html();
      
      // Generate SVG - just for debugging 
      fs.writeFile('chart.svg', svg, function() { console.log('done'); });	
      // Start convert
      if(svg) {
        convert	= spawn('convert', ['svg:-', 'png:-']);

        // We're writing an image, hopefully...
        response.writeHeader(200, {'Content-Type': 'image/png'});
        
        // Pump in the svg content
        convert.stdin.write(svg);
        convert.stdin.end();
        
        // Write the output of convert straight to the response
        convert.stdout.on('data', function(data) {
          response.write(data);
        });
      }

      // When we're done, we're done
      convert.on('exit', function(code) {
        response.end();	
      });
    }
	});
  
	
}).listen(2308);

console.log('listening on 2308');
