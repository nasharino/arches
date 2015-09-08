define(['jquery', 
    'underscore',
    'backbone',
    'bootstrap',
    'knockout',
    'knockout-mapping'], 
    function($, _, Backbone, bootstrap, ko, koMapping) {

        return Backbone.View.extend({

            initialize: function(options) { 
                var self = this;

                ko.observableArray.fn.get = function(entitytypeid, key) {
                    var allItems = this();
                    var ret = '';
                    _.each(allItems, function(node){
                        if (entitytypeid.search(node.entitytypeid()) > -1){
                            ret = node[key]();
                        }
                    }, this);
                    return ret
                }

                this._rawdata = ko.toJSON(JSON.parse($('#timefilterdata').val()));
                this.viewModel = JSON.parse(this._rawdata);


                this.query = {
                    filter:  {
                        year_min_max: ko.observableArray(),
                        inverted: ko.observable(false),
                    },
                    changed: ko.pureComputed(function(){
                        var ret = ko.toJSON(this.query.filter.year_min_max()) +
                            ko.toJSON(this.query.filter.inverted());
                        return ret;
                    }, this).extend({ rateLimit: 200 })
                };

                this.query.filter.year_min_max.subscribe(function(newValue){
                    var sliderenabled = newValue.length === 2;
                    this.trigger('enabled', sliderenabled, this.query.filter.inverted());
                }, this);

                $(window).resize(function() {
                    self.setupTimeHistogram(self.viewModel);
                })

            },

            restoreState: function(filter){
                if(typeof filter !== 'undefined'){
                    if('inverted' in filter){
                        this.query.filter.inverted(filter.inverted);
                    }
                    if('year_min_max' in filter && filter.year_min_max.length === 2){
                        _.each(filter.year_min_max, function(year){
                            this.query.filter.year_min_max.push(year);
                        }, this);
                    }
                }

                this.setupTimeHistogram(this.viewModel);

            },

            setupTimeHistogram: function(data, min_year, max_year){
                //D3 Time Filter
                // sizing information, including margins so there is space for labels, etc
                // Adapted from: http://bl.ocks.org/mbostock/3048450
                var w = $(this.el).width();
                var h = 50;
                var num_bins = 300;
                var num_ticks = 5;
                var target = "#time-scale";
                var bar_width = 1;
                var label_offset = -2;
                var values = [];
                var self = this; 

                _.each(data, function(item, index, list){
                    var exploded_array = [];
                    var k = 0;
                    while (k < item.doc_count) {
                        exploded_array[k] = item.key;
                        k++;
                    }
                    values = values.concat(exploded_array)
                })

                min_year = min_year || d3.min(values);
                max_year = max_year || d3.max(values);
                num_bins = num_bins < max_year - min_year ? num_bins : max_year - min_year;

                // A formatter for counts.
                var formatCount = d3.format(",f");

                var margin = {top: 5, right: 40, bottom: 0, left: 40},
                    width = w - margin.left - margin.right,
                    height = h - margin.top - margin.bottom;

                var x = d3.scale.linear()
                    .domain([min_year, max_year])
                    .range([0, width]);

                // Generate a histogram using twenty uniformly-spaced bins.
                var data = d3.layout.histogram()
                    .bins(num_bins)
                    (values);

                var y = d3.scale.linear()
                    .domain([0, d3.max(data, function(d) { return d.y; })])
                    .range([height, 0]);


                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("top")
                    .tickSize(50)
                    .tickFormat(d3.format("f"))
                    .ticks(num_ticks);


                this.brush = d3.svg.brush()
                    .x(x)
                    .on("brushend", function(){
                        self.query.filter.year_min_max(self.brush.extent());
                    });

                if(self.query.filter.year_min_max().length == 2){
                    this.brush.extent(self.query.filter.year_min_max());
                }

                d3.select("svg").remove();
                var svg = d3.select(target).append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


                var bar = svg.selectAll(".bar")
                    .data(data)
                    .enter().append("g")
                    .attr("class", "bar")
                    .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });


                bar.append("rect")
                    .attr("x", 1)
                    .attr("width", w/num_bins)
                    .attr("height", function(d) { return height - y(d.y); });


                //Label Tick lines
                svg.append("g")
                    .attr("class", "x-axis")
                    //.attr("transform", "translate(0," + height + ")")
                    .attr("transform", "translate(0, 60)")
                    .call(xAxis)
                    .selectAll("text")
                    .attr("dx", label_offset)
                    .style("text-anchor", "start");


                // add the brush target area on the chart
                this.brush_target = svg.append("g")
                    .attr("class", "x brush")
                    .call(this.brush);

                this.brush_target
                    .selectAll("rect")
                                
                    // -6 is magic number to offset positions for styling/interaction to feel right
                    .attr("y", -6)

                    // need to manually set the height because the brush has
                    // no y scale, i.e. we should see the extent being marked
                    // over the full height of the chart
                    .attr("height", height +7);  // +7 is magic number for styling

            },

            // demo: function(){
            //     //D3 Time Filter
            //     // sizing information, including margins so there is space for labels, etc
            //     // Adapted from: http://bl.ocks.org/mbostock/3048450
            //     var w = 1280;//$("#time-scale").width();
            //     var h = 50;
            //     var num_bins = 300;
            //     var num_ticks = 5;
            //     var target = "#time-scale";
            //     var bar_width = 1;
            //     var label_offset = -2;

            //     var values =  [-1000, -900, -988, -988, 25, 44, 400, 405, 399, 399, 401, -10, 
            //     -977, -960, -960, -960, -960, -960, -499, -479, -450, 0, 899, 904, 933, 933, 
            //     934, 935, 1288, 1305, 1492, 1515, 1615, 1789, 1888, 1880, 1889, 1890, 1890, 
            //     1890, 1900, 1946, 1955, 1979, 1999, 2001, 2010, -250, -240, -230, -235, -235, 
            //     -235, -240, -230, 1100, 1105, 1099, 1100, 1100, 1104, 680, 675, 689, 1020, 
            //     1019, 1021, 1018, 1020, 1019, 1019, 1018, 1020, 676, 677, 2013, 2014, 2015, 
            //     80, 77, 81, 82, 62, 61, 60, 60, 70, 71, 71, 70, 70, 71, 490, 489, -488, -490, 
            //     -487, 1400, 1401];

            //     // A formatter for counts.
            //     var formatCount = d3.format(",f");

            //     var margin = {top: 5, right: 40, bottom: 0, left: 40},
            //         width = w - margin.left - margin.right,
            //         height = h - margin.top - margin.bottom;

            //     var x = d3.scale.linear()
            //         .domain([d3.min(values), d3.max(values)])
            //         .range([0, width]);

            //     // Generate a histogram using twenty uniformly-spaced bins.
            //     var data = d3.layout.histogram()
            //         .bins(num_bins)
            //         (values);

            //     var y = d3.scale.linear()
            //         .domain([0, d3.max(data, function(d) { return d.y; })])
            //         .range([height, 0]);


            //     var xAxis = d3.svg.axis()
            //         .scale(x)
            //         .orient("top")
            //         .tickSize(50)
            //         .tickFormat(d3.format("f"))
            //         .ticks(num_ticks);


            //     // brush tool to let us zoom and pan using the overview chart
            //     var brush = d3.svg.brush()
            //         .x(x)
            //         .on("brush", brushed);


            //     var svg = d3.select(target).append("svg")
            //         .attr("width", width + margin.left + margin.right)
            //         .attr("height", height + margin.top + margin.bottom)
            //         .append("g")
            //         .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


            //     var bar = svg.selectAll(".bar")
            //         .data(data)
            //         .enter().append("g")
            //         .attr("class", "bar")
            //         .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });


            //     bar.append("rect")
            //         .attr("x", 1)
            //         .attr("width", bar_width)
            //         .attr("height", function(d) { return height - y(d.y); });


            //     //draw tick lines
            //     // svg.selectAll("line.x")
            //     //     .data(x.ticks(num_ticks))
            //     //     .enter().append("line")
            //     //     .attr("class", "x")
            //     //     .attr("x1", x)
            //     //     .attr("x2", x)
            //     //     .attr("y1", 0)
            //     //     .attr("y2", 50)
            //     //     .style("stroke", "#999")


            //     //Label Tick lines
            //     svg.append("g")
            //         .attr("class", "x-axis")
            //         //.attr("transform", "translate(0," + height + ")")
            //         .attr("transform", "translate(0, 60)")
            //         .call(xAxis)
            //         .selectAll("text")
            //         .attr("dx", label_offset)
            //         .style("text-anchor", "start");


            //     // add the brush target area on the chart
            //     svg.append("g")
            //         .attr("class", "x brush")
            //         .call(brush)
            //         .selectAll("rect")
                                
            //         // -6 is magic number to offset positions for styling/interaction to feel right
            //         .attr("y", -6)

            //         // need to manually set the height because the brush has
            //         // no y scale, i.e. we should see the extent being marked
            //         // over the full height of the chart
            //         .attr("height", height +7);  // +7 is magic number for styling



            //     function brushed() {
                    
            //         x.domain(brush.empty() ? x.domain() : brush.extent());
                    
            //         // Add additional functionality here (eg: update svg elements, etc.)
                    

            //     }
            // },

            clear: function(){
                this.query.filter.inverted(false);
                this.query.filter.year_min_max.removeAll();
                this.brush.clear();
                this.brush_target.call(this.brush);
            }

        });

});