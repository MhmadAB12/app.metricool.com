
var BeEvolutionChart = function (container, options) {
	
	this.container = container;
	this.monthNames = options.monthNames;
	this.dayNames = options.dayNames;
	this.barSerieName = options.barSerieName;
	this.metrics = options.metrics;
	this.colors = options.colors;
	this.negativeColor = options.negativeColor;
	this.labels = options.labels;
	this.aggregationPanels = options.aggregationPanels;
	this.aggregationFunctions = options.aggregationFunctions;
	this.extraParameters = options.extraParameters;
	this.active = options.active;
	this.callback = options.callback;
	
	this.panels = {};
	this.previousPoint = null;
	this.series = {};
	this.prevSeries = {};
	this.chart = null;
	this.aggregations = {};
	this.prevAggregations = {};
	this.days = {};
	this.start;
	this.end;
	this.linkId;
	
	
	
	if (this.extraParameters.startsWith("&")) {
		this.extraParameters = this.extraParameters.replace("&", "?");
	}
	
};

BeEvolutionChart.prototype.init = function() {
	
	var panels = this.panels;
	var aggregationPanels = this.aggregationPanels;
	$.each( this.metrics, function( index, metric ) {
		panels[aggregationPanels[metric]] = metric;
	});
	
	var monthNames = this.monthNames;
	var dayNames = this.dayNames;
	var container = this.container;
	
	this.chart = $.plot(container,
   			[[0,0]], {
   		   series: {
   				curvedLines: {
					active: true,
                	monotonicFit: true
				}
   		   },
   		   legend: {show: false},
   		   grid: { hoverable: true, 
   					mouseActiveRadius: 10, 
   				   tickColor: "#f9f9f9",
   				   borderWidth: 0
   				 },
   		   xaxis: {mode: "time", 
   			   		tickLength:0,
   					minTickSize: [1, "day"], 
   					timeformat: "%e %b",
   					monthNames: monthNames,
   					dayNames: dayNames
   				},
   			yaxes: [ { show: false }, {show: true, tickLength:0, ticks:3, tickDecimals: 0 }, {show: false, position: 'right'} ]
   		});
	
	this.container.bind("plothover", function (event, pos, item) {

		if (item) {
			if (previousPoint != item.dataIndex) {
				previousPoint = item.dataIndex;

				$("#be_evolution_tooltip").remove();
				var x = item.datapoint[0];
				var	y = item.datapoint[1].toFixed(2);
				if (parseFloat(y) == parseFloat(item.datapoint[1].toFixed(0))) {
					y = item.datapoint[1].toFixed(0);
				}
				var date = new Date(x);
				var months = monthNames;
				var contents = date.getDate() + " " + months[date.getMonth()] + "<br>" + y + " " + item.series.label;

				$('<div id="be_evolution_tooltip">' + contents + '</div>').css( {
	    			position: 'absolute',
	    			display: 'none',
	    			top: item.pageY + 5,
	    			left: item.pageX + 5,
	    			border: '1px solid #709984',
	    			padding: '3px',
	    			'background-color': item.series.color,
	    			'color' : '#fff',
	    			'border-radius': '5px',
	    			opacity: 0.80
	    		}).appendTo("body").fadeIn(200);
				
			}
		}
		else {
			$("#be_evolution_tooltip").remove();
			previousPoint = null;
		}
	});
	
	var colors = this.colors;
	var active = this.active;
	var metrics = this.metrics;
	var beChart = this;
	$.each( this.metrics, function( index, metric ) {
		
		if (typeof active[metric] === 'undefined') {
			active[metric] = true;
		}
		var panelName = aggregationPanels[metric];
		
		if (panelName) {
			var panel = $('#' + panelName);
			if (panel) {
				panel.click(function(event) {
					
					var panelId = $(event.target).closest('.panel').attr('id');
					var metric = panels[panelId];
					
					if (metric) {
						active[metric] = !active[metric];
						
						beChart.paintAggregation(metric);
						beChart.paintSeries();
					}
			  	});
			}
		}
	});
	
	
}

BeEvolutionChart.prototype.loadSeriesOfLink = function(start, end, linkId) {

	
	this.start = start;
	this.end = end;
	this.linkId = linkId;
	
	var chart = this;
	
	$.each(this.metrics, function( index, metric ) {
		chart.loadSerie(metric);
	});
	
	
};



BeEvolutionChart.prototype.loadSeries = function(start, end) {

	
	this.start = start;
	this.end = end;
	
	var chart = this;
	
	$.each(this.metrics, function( index, metric ) {
		chart.loadSerie(metric);
	});
	
	
};

BeEvolutionChart.prototype.prevEndDate = function() {
	return  moment(this.start).subtract(1, 'days');
};

BeEvolutionChart.prototype.prevStartDate = function(metric) {
	var prevEnd = this.prevEndDate();
	this.days[metric] = this.end.diff(this.start, 'days');
	var prevStart = moment(prevEnd);
	return prevStart.subtract(this.days[metric], 'days');
};

BeEvolutionChart.prototype.loadSerie = function(metric) {
	
	var chart = this;
	
	var lStart = chart.start;
	if (chart.aggregationFunctions[metric] == 'LAST') {
		lStart = moment(chart.start).subtract(1, 'days');
	}
	  
	$.ajax({
		url: 'api/stats/timeline/' + metric + chart.extraParameters,
		data: {
			start: lStart.format("YYYYMMDD"),
			end: chart.end.format("YYYYMMDD"),
			linkid: chart.linkId
			},
		success: function(serieData) {
			
			if (!serieData) {
				location.reload();
	    	}			
			
	    	chart.series[metric] = serieData;
	    	
	    	chart.calculateAggregation(metric);
			chart.paintSeries();
	    	chart.paintAggregation(metric);


	    	var prevEnd = chart.prevEndDate();
	    	var prevStart = chart.prevStartDate(metric);
	    	
	    	
	    	$.ajax({
	    		url: 'api/stats/timeline/' + metric + chart.extraParameters,
	    		data: {
	    			start: prevStart.format("YYYYMMDD"),
	    			end: prevEnd.format("YYYYMMDD"),
	    			linkid: chart.linkId
	    			},
	    		success: function(serieData) {
	    			
	    	    	chart.prevSeries[metric] = serieData;
	    	
	    	    	chart.calculatePrevAggregation(metric);
	    	    	chart.paintAggregation(metric);

	    	    	
	    	    	if (chart.callback) {
	    	    		chart.callback(chart.extraParameters, chart);
	    	    	}
	    		}
	    	});
	    	
	    }
	});


	

};

BeEvolutionChart.prototype.calculateAggregation = function(metric) {
	var count = 0;
	if (this.aggregationFunctions[metric] == 'LAST') {
    	for (var i in this.series[metric]) {
    		this.aggregations[metric] = parseFloat(this.series[metric][i][1]);
    		count++;
    	}
	}
	else if (this.aggregationFunctions[metric] == 'SUM') {
		this.aggregations[metric] = 0;
    	for (var i in this.series[metric]) {
    		this.aggregations[metric] += parseFloat(this.series[metric][i][1]);
    		count++;
    	}
	}
	else if (this.aggregationFunctions[metric] == 'AVG') {
    	var sum = 0;
    	for (var i in this.series[metric]) {
    		sum += parseFloat(this.series[metric][i][1]);
    		count++;
    	}
    	if (count > 0) {
    		this.aggregations[metric] = sum / count;
    	}
    	else {
    		this.aggregations[metric] = 0;
    	}
	}
	else if (this.aggregationFunctions[metric] == 'fbDailyEngagement') {
		if (this.aggregations['dailyImpressionsUnique']) {
			this.aggregations[metric] = this.aggregations['fbDailyInteractions'] * 1000 / this.aggregations['dailyImpressionsUnique'];
		}
		else {
			this.aggregations[metric] = 0;
		}
	}
	else if (this.aggregationFunctions[metric] == 'igEngagement') {
		
		var chart = this;
		
		$.ajax({
			url: 'api/stats/aggregation/igEngagement' + chart.extraParameters,
			data: {
				start: chart.start.format("YYYYMMDD"),
				end: chart.end.format("YYYYMMDD")
				},
			async: false,
			success: function(data) {
				chart.aggregations[metric] = data;
			}
		});
	}
	else if (this.aggregationFunctions[metric] == 'fbAdsPerformance' || (this.aggregationFunctions[metric] == 'adwordsPerformance')) {
		
		var chart = this;
		
		$.ajax({
			url: 'api/stats/aggregations/' + this.aggregationFunctions[metric] + chart.extraParameters,
			data: {
				start: chart.start.format("YYYYMMDD"),
				end: chart.end.format("YYYYMMDD")
				},
			async: false,
			success: function(data) {
				$.each( chart.metrics, function( index, metric ) {
					if (data[metric]) {
						chart.aggregations[metric] = data[metric];
					}
				});
				
			}
		});
	}
	else {
		this.aggregations[metric] = this.aggregationFunctions[metric];
	}

	if (metric == 'dailyImpressionsUnique'){

		this.aggregations['fbDailyEngagement'] = this.aggregations['fbDailyInteractions'] * 1000 / this.aggregations['dailyImpressionsUnique'];

	}
}

BeEvolutionChart.prototype.calculatePrevAggregation = function(metric) {

	if (this.aggregationFunctions[metric] == 'LAST') {
		
    	for (var i in this.prevSeries[metric]) {
    		this.prevAggregations[metric] = parseFloat(this.prevSeries[metric][i][1]);
    	}
    	
	}
	else if (this.aggregationFunctions[metric] == 'SUM') {
		var prevCount = 0;
    	this.prevAggregations[metric] = 0;
    	for (var i in this.prevSeries[metric]) {
    		this.prevAggregations[metric] += parseFloat(this.prevSeries[metric][i][1]);
    		prevCount++;
    	}
    	if (prevCount == 0) {
    		this.prevAggregations[metric] = null;
    	}
	}
	else if (this.aggregationFunctions[metric] == 'AVG') {
    	var prevCount = 0;
    	var sum = 0;
    	for (var i in this.prevSeries[metric]) {
    		sum += parseFloat(this.prevSeries[metric][i][1]);
    		prevCount++;
    	}
    	
    	if (prevCount > 0) {
    		this.prevAggregations[metric] = sum / prevCount;
    	}
    	else {
    		this.prevAggregations[metric] = 0;
    	}
	}
	else if (this.aggregationFunctions[metric] == 'fbDailyEngagement') {
		if (this.prevAggregations['dailyImpressionsUnique']) {
			this.prevAggregations[metric] = this.prevAggregations['fbDailyInteractions'] * 1000 / this.prevAggregations['dailyImpressionsUnique'];
		}
		else {
			this.prevAggregations[metric] = 0;
		}
	}
	else if (this.aggregationFunctions[metric] == 'igEngagement') {
		
		var chart = this;
		var prevEnd = moment(chart.start);
		prevEnd = moment(chart.start).subtract(1, 'days');
    	var prevStart = moment(prevEnd);
    	prevStart.subtract(chart.days[metric], 'days');
    	
		
		$.ajax({
			url: 'api/stats/aggregation/igEngagement' + chart.extraParameters,
			data: {
				start: prevStart.format("YYYYMMDD"),
    			end: prevEnd.format("YYYYMMDD")
				},
			async: false,
			success: function(data) {
				chart.prevAggregations[metric] = data;
			}
		});
	}
	else if ((this.aggregationFunctions[metric] == 'fbAdsPerformance') || (this.aggregationFunctions[metric] == 'adwordsPerformance')) {
		
		var chart = this;
		var prevEnd = moment(chart.start);
		prevEnd = moment(chart.start).subtract(1, 'days');
    	var prevStart = moment(prevEnd);
    	prevStart.subtract(chart.days[metric], 'days');
    	
		
		$.ajax({
			url: 'api/stats/aggregations/' + this.aggregationFunctions[metric] + chart.extraParameters,
			data: {
				start: prevStart.format("YYYYMMDD"),
    			end: prevEnd.format("YYYYMMDD")
				},
			async: false,
			success: function(data) {
				
				$.each( chart.metrics, function( index, metric ) {
					if (data[metric]) {
						chart.prevAggregations[metric] = data[metric];
					}
				});
				
			}
		});
	}
}


BeEvolutionChart.prototype.paintAggregation = function(metric) {
	
	var panelName = this.aggregationPanels[metric];
	if (panelName) {
		var panel = $('#' + panelName);
		if (panel) {

			var title = $('#' + panelName + ' .title');
			title.html(this.labels[metric]);
			
			var value = $('#' + panelName + ' .value');
			
			var icon = "";
			if (this.prevAggregations[metric]) {
				var popover = " data-toggle='popover' data-placement='top' data-html='true' data-container='body' data-trigger='hover'";
				if (this.prevAggregations[metric] < this.aggregations[metric]) {
					popover += " data-content='" + this.formatDelta(this.prevAggregations[metric], this.aggregations[metric]) + "' ";
					icon = "<i class='fa fa-arrow-circle-up' " + popover + "></i>";
				}
				else if (this.prevAggregations[metric] > this.aggregations[metric]) {
					popover += " data-content='" + this.formatDelta(this.prevAggregations[metric], this.aggregations[metric]) + "' ";
					icon = "<i class='fa fa-arrow-circle-down' " + popover + "></i>";
				}
				else {
					icon = "<i class='fa fa-pause-circle fa-rotate-90' style='padding: 0px 7px 7px 0px;'></i>";
				}
			}
			
			var color = this.colors[metric];
			if (this.negativeColor && this.negativeColor[metric]) {
				if (this.aggregations[metric] < 0) {
					color = this.negativeColor[metric];
				}
			}
			
			
			var popover = " data-toggle='popover' data-placement='top' data-html='true' data-container='body' data-trigger='hover' data-content='" + this.aggregations[metric] + "' ";
			if (this.aggregations[metric] < 10000) {
				popover = "";
			}
			value.html("<p style='margin: 0px' " + popover + ">" + this.formatBigNumber(this.aggregations[metric]) + icon + "</p>");
			if (this.active[metric]) {
				panel.css("background-color", color);
			}
			else {
				panel.css('background-color', convertHex(color, 20));
			}
			
			$('[data-toggle="popover"]').popover();
			
		}
	}
}

BeEvolutionChart.prototype.paintSeries = function() {
	

	var maxPosts = 3;

	var data = [];
	for (var serieName in this.series) {
	
		if (this.active[serieName]) {
			if (serieName == this.barSerieName) {
				var postsSerie = this.series[serieName];
				if (postsSerie && postsSerie[0] && postsSerie[0][1]) {
					maxPosts=Number(postsSerie[0][1]);
					for(var i=1;i<postsSerie.length;i++) {
					    if (Number(postsSerie[i][1])>maxPosts) maxPosts=Number(postsSerie[i][1]);
					}
				}
				
				var negativePostSerie = [];
				var positivePostSerie = [];
				var negative = false;
				for(var i = 0; i < postsSerie.length; i++) {
					
					if (Number(postsSerie[i][1]) < 0) {
						negativePostSerie.push(postsSerie[i]);
						negative = true;
					}
					else {				
						positivePostSerie.push(postsSerie[i]);
					}
				}
				
				data.push({ 
					data: positivePostSerie, 
					label: this.labels[serieName],
					color: this.colors[serieName],
			        bars: {
			            show: true,
			            align: "center",
			            barWidth: 24 * 60 * 60 * 400,
			            lineWidth:0
			        }
				});
				
				if (negative) {
					var color = this.colors[serieName];
					if (this.negativeColor[serieName]) {
						color = this.negativeColor[serieName];
					}
					data.push({ 
						data: negativePostSerie, 
						label: this.labels[serieName],
						color: color,
				        bars: {
				            show: true,
				            align: "center",
				            barWidth: 24 * 60 * 60 * 400,
				            lineWidth:0
				        }
					});
				}
			}
			else {
			
				//line
				data.push({ 
					data: this.series[serieName],  
					color: this.colors[serieName],
					yaxis: 2,
					lines: { show: true,
						lineWidth: 2
					 },
					 hoverable: false,
					curvedLines: {apply: true },
		    	   	shadowSize: 0
				});
				
				//Points
				data.push({ 
					data: this.series[serieName], 
					label: this.labels[serieName], 
					color: this.colors[serieName],
					yaxis: 2,
					lines: { show: false },
		    	   	points: { show: true,
		    	   			fillColor: this.colors[serieName],
		    	   			radius: 2,
		    				 lineWidth: 0.5 
		    			 },
		    	   	shadowSize: 0
				});
				
			}
		}
	}
	
	 this.chart.setData(data);
	 this.chart.getOptions().xaxes[0].min = this.start;
	 this.chart.getOptions().xaxes[0].max = this.end;
	 this.chart.getOptions().yaxes[0].max = maxPosts + 3;
	 this.chart.setupGrid();
	 this.chart.draw();

	
}

BeEvolutionChart.prototype.formatBigNumber = function(number) {
	
	if (number == null) {
		return '-';
	}
	
	if (number > 9999) {
		
		if (number > 9999999) {
			return (Math.round(number / 1000000)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "M";
		}
		
		return (Math.round(number / 1000)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "K";
	}
	
	if (number % 1 == 0) {
		return (number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}
	
	return number.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

BeEvolutionChart.prototype.formatDelta = function(previous, current) {
	
	var number = current - previous;
	var percentageNumber = number / previous * 100;
	var percentage = percentageNumber.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	
	if (number == null) {
		return '-';
	}
	
	var positive = true;
	if (number < 0) {
		positive = false;
		number = number * -1;
	}
	
	if (positive) {
		return "+" + this.formatBigNumber(number) + " (+" + percentage + "%)";
	}
	
	return "-" + this.formatBigNumber(number) + " (" + percentage + "%)";
}
