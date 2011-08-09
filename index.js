var http  = require('http'),
  parse  = require('url').parse,
  spawn  = require('child_process').spawn,
  fs = require('fs'),
  jsdom  = require('jsdom');
  
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

var port = process.env.PORT || 2308;

this.server = http.createServer(function(request, response) {
  var url = parse(request.url, true),
    query = (url.query || {});
  
  createHighchartsWindow(function(window) {
    var $  = window.jQuery,
      Highcharts   = window.Highcharts,
      document  = window.document,
      $container  = $('<div id="container" />'),
      chart, svg, convert, 
      chartDefinition = '', 
      chartObject = {};
   
    if (query.chart) {
      try {
        chartObject = $.parseJSON(query.chart);
        chartRender();
      }
      catch(err) {
        console.log(err);
      }
    }
    if (query.host) {
      var options = {
        host: query.host,
        port: 80,
        path: "/" + query.path 
      };

      http.get(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          chartDefinition += chunk;
          try {
            console.log('trying...');
            chartObject = $.parseJSON(chartDefinition);
            if (chartObject.chart.defaultSeriesType) {
              chartRender();
            }
          }
          catch (err) {
            console.log('still waiting...');  
          }
          
        });

        console.log("Got response: " + res.statusCode);
      }).on('error', function(e) {
        console.log("Got error: " + e.message);
      });    
    }
    function chartRender() {
      console.log('Render started');
      //console.log(chartDefinition);  
      // if(!chartDefinition) {
      //   response.end();
      // }
      $container.appendTo(document.body);
      chartObject.chart.renderTo = $container[0];
      chartObject.chart.renderer = 'SVG';
      chart = new Highcharts.Chart(chartObject);
      
      svg = $container.children().html().replace(/style="0[^"]*"/g, "");
      
      // Generate SVG - just for debugging 
      // fs.writeFile('chart.svg', svg, function() { console.log('done'); });  
      // Start convert
      if(svg) {
        convert  = spawn('convert', ['svg:-', 'png:-']);

        // We're writing an image, hopefully...
        response.writeHead(200, {'Content-Type': 'image/png'});
        
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
  
  
}).listen(port, function() {
  console.log('listening on ' + port);
});

