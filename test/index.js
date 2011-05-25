var hc = require('../lib/node-highcharts'),
	fs = require('fs'),
	options = {
		chart: {
			defaultSeriesType: 'column',
			renderTo: 'container',
			renderer: 'SVG',
			width: 800,
			height: 600,
			tooltipTick: null
		},
		series: [{
			animation: false,
			data: [1,2,3,4,5]
		}]
	};
	
hc.render(options, 'svg', function(result, err) {
	console.log('what?');
	fs.writeFile('chart.svg', result, function() { console.log('done'); });
});
