console.log('hello world!');

// create two charts (main chart and 'brush' chart)
// use the same width, but different height
var margin = { top: 20, right: 20, bottom: 110, left: 40 },
	margin2 = { top: 430, right: 20, bottom: 30, left: 40 },
	width = 960 - margin.left - margin.right,
	height = 500 - margin.top - margin.bottom,
	height2 = 500 - margin2.top - margin2.bottom;

// create svg element
var svg = d3.select('body').append('svg')
	.attr('height', height + margin.top + margin.bottom)
	.attr('width', width + margin.left + margin.right);

// set scales
// create two sets (one for each chart)
var xScale = d3.scaleLinear().range([0, width]),
	yScale = d3.scaleLinear().range([height, 0]),
	xScale2 = d3.scaleLinear().range([0, width]),
	yScale2 = d3.scaleLinear().range([height2, 0]);

// set axis
// create two sets
// only the main chart has a yAxis because the 'brush' chart is too short for one
var xAxis = d3.axisBottom(xScale).tickFormat(d3.format(',.2r')),
	xAxis2 = d3.axisBottom(xScale2).tickFormat(d3.format(',.2r')),
	yAxis = d3.axisLeft(yScale);

// create brush object
var brush = d3.brushX()
	.extent([[0, 0], [width, height2]])
	.on('brush end', brushed);

// create zoom object
var zoom = d3.zoom()
	.scaleExtent([1, Infinity])
	.translateExtent([[0, 0], [width, height]])
	.extent([[0, 0], [width, height]])
	.on('zoom', zoomed);

// create area path generator for main chart
var area = d3.area()
	.curve(d3.curveMonotoneX)
	.x(function(d) { return xScale(d.dist_cum); })
	.y0(height)
	.y1(function(d) { return yScale(d.ele); });

// create area path generator for brush chart
var area2 = d3.area()
	.curve(d3.curveMonotoneX)
	.x(function(d) { return xScale2(d.dist_cum); })
	.y0(height2)
	.y1(function(d) { return yScale2(d.ele); });

// limits main chart's area path from going into the margins when panning and zooming
svg.append('defs').append('clipPath')
	.attr('id', 'clip')
	.append('rect')
	.attr('width', width)
	.attr('height', height);

// main chart group element
var focus = svg.append('g')
	.attr('class', 'focus')
	.attr('transform', `translate(${margin.left}, ${margin.top})`);

// brush chart group element
var context = svg.append('g')
	.attr('class', 'context')
	.attr('transform', `translate(${margin2.left}, ${margin2.top})`);

// loading in CSV data
// formatter defined below zoomed function
d3.csv('data/pct_ca_generalized.csv', formatter, function(error, data) {
	if (error) throw error;
	
	//console.log(data);
	
	// set domains for x and y scales of both charts (main and brush)
	// scale.domain() both gets and sets, so if you call it without passing in any parameters, it returns the current domain
	// if a parameter is passed into scale.domain(), it sets it with whatever is passed in
	xScale.domain(d3.extent(data, function(d) { return d.dist_cum; }));
	xScale2.domain(xScale.domain());
	yScale.domain([0, d3.max(data, function(d) { return d.ele; })]);
	yScale2.domain(yScale.domain());
	
	// main chart
	focus.append('path')
		.datum(data)
		.attr('class', 'area')
		.attr('d', area);
	
	focus.append('g')
		.attr('class', 'axis axis--x')
		.attr('transform', `translate(0, ${height})`)
		.call(xAxis);
	
	focus.append('g')
		.attr('class', 'axis axis--y')
		.call(yAxis);
		
	// brush chart
	context.append('path')
		.datum(data)
		.attr('class', 'area')
		.attr('d', area2);
	
	context.append('g')
		.attr('class', 'axis axis--x')
		.attr('transform', `translate(0, ${height2})`)
		.call(xAxis2);
	
	context.append('g')
		.attr('class', 'brush')
		.call(brush)
		.call(brush.move, xScale.range());
	
	// invisible rectangle to listen for mouse events for zooming
	svg.append('rect')
		.attr('class', 'zoom')
		.attr('width', width)
		.attr('height', height)
		.attr('transform', `translate(${margin.left}, ${margin.top})`)
		.call(zoom);
});

// callback for brush object's event listener
// called everytime the brush is used
function brushed() {
	// ignore zoom events
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return;

	var s = d3.event.selection || xScale2.range();
	
	// inverts brush's min and max x coordinates
	// passed to main chart's x-scale domain
	xScale.domain(s.map(xScale2.invert, xScale2));

	// redrawing main chart's area path and x-axis to match brush event
	focus.select('.area').attr('d', area);
	focus.select('.axis--x').call(xAxis);
	
	// change and set zoom size and position to match brush object's current state
	svg.select('.zoom')
		.call(
			zoom.transform,
			d3.zoomIdentity
				.scale(width / (s[1] - s[0]))
				.translate(-s[0], 0)
		);
}

// callback for zoom object's event listener
// called everytime zoom is used
function zoomed() {
	// ignore brush events
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush') return;

	// console.log('zoom event', d3.event);
	
	var t = d3.event.transform;
	
	// inverts zoom's min and max x coordinates
	// passed to main chart's x-scale domain
	xScale.domain(t.rescaleX(xScale2).domain());
	
	// redrawing main chart's area path and x-axis to match zoom event
	focus.select('.area').attr('d', area);
	focus.select('.axis--x').call(xAxis);
	
	// change and set brush size and position to match zoom object's current state
	context.select('.brush')
		.call(
			brush.move,
			xScale.range().map(t.invertX, t)
		);
	
	// console.log(xScale.range().map(t.invertX, t));
}

// parse and format rows from csv data
// used with d3.csv
function formatter(d) {
	d.dist_cum = +d.dist_cum / 1609.34; // convert to miles
	d.ele = +d.ele * 3.28084; // convert to feet
	return d;
}