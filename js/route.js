

var MUNI = MUNI || {};




var ROUTE = (function ($,M) {

    M.Route = function(routeTag, map) {
        this.url = "http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=sf-muni&r=";
        Microsoft.Maps.loadModule("Microsoft.Maps.AdvancedShapes");
        this.map = map;
        this.routeTag = routeTag;
        this.title = "";
        this.color = "";
        this.oppositeColor = "";
        this.routeDetailLayer = new Microsoft.Maps.EntityCollection({ visible: false });
        this.vehicleLayer = new Microsoft.Maps.EntityCollection({ visible: false });
        this.isVisible = false;
        this.vc = null;    // Vechicle Controller
    }


    M.Route.prototype = {
        constructor: M.Route,

        init: function () {
            var dfd = $.Deferred();
            var self = this;

            var vehpromise = this.fetchVehicles();
            var roadpromise = this.fetch_road_stops();
            this.isVisible = true;

            $.when(roadpromise, vehpromise).then(function () {
                self.show();
                dfd.resolve(self.routeTag);
            });

            return dfd.promise();
        },


        fetchVehicles : function(){
            var self = this;
            var dfd = $.Deferred();
            this.map.entities.push(this.vehicleLayer);
            if (this.vc === null) {

                this.vc = new VehicleController(this.routeTag, "http://webservices.nextbus.com/service/publicXMLFeed");

                $(this.vc).on("vehiclesReceived", function(e,data){
                    self.renderVehicles(data);
                    dfd.resolve();
                });

            }
            this.startVehicles();
            return dfd.promise();
        },

        renderVehicles : function(vehicles){
            var self = this;
            this.vehicleLayer.clear();
 
            for (var vehTag in vehicles) {
                if (vehicles.hasOwnProperty(vehTag)) {
                    var v = vehicles[vehTag];
                    if (v.predictable === "true") {
                        var loc = new Microsoft.Maps.Location(v.lat, v.lon);
                        var pin = new Microsoft.Maps.Pushpin(loc, { zIndex: 1000, text: v.routeTag });
                        pin.Title = v.id;
                        self.vehicleLayer.push(pin);
                   
                    }
                }
            }

        },
        fetch_road_stops : function () {
            var self = this;

            var dfd = $.Deferred();
            if (this.rdf === undefined) {
              // Road Controller gets stops aswell, but i will chnage this later
                this.rdf = new RouteDetailFetcher(this.routeTag, this.url);

                $(this.rdf).on("roadReceived", function (e, data) {
                    // Contruct the road and place it in the entityCollection
                
                    self.renderRoad(data.paths);
                    self.renderStops(data.stops);
                    dfd.resolve();
                });
                this.rdf.fetchRoad();
            }

            return dfd.promise();
        },

        renderRoad : function (data) {

            var color = Microsoft.Maps.Color.fromHex("#" + this.rdf.color);

            for (var i = 0; i < data.length; i++) {
                var path = data[i];
                var positions = [];

                path.forEach(function (p) {
                    var loc = new Microsoft.Maps.Location(p.lat, p.lon);
                    positions.push(loc);
                });

                var poly = new Microsoft.Maps.Polyline(positions, { strokeColor: color });
                this.routeDetailLayer.push(poly);
            }
            this.map.entities.push(this.routeDetailLayer);
            this.showLayers();
        },

        renderStops : function (data) {
            var self = this;
            var color = Microsoft.Maps.Color.fromHex("#" + this.rdf.color);
            for (var i = 0; i < data.length; i++) {
                var stop = data[i];
                var loc = new Microsoft.Maps.Location(stop.lat, stop.lon);
                var pin = new Microsoft.Maps.Pushpin(loc, { typeName: 'micro' });
                
                pin.stopInfo = stop;
                Microsoft.Maps.Events.addHandler(pin, 'click', displayEventInfo);

                Microsoft.Maps.Events.addHandler(pin, 'mouseover', displayInfo);
                Microsoft.Maps.Events.addHandler(pin, "mouseout", removeInfo);
                
                self.routeDetailLayer.push(pin);
            }



            function removeInfo(e){
                var stop = e.target.stopInfo;
                if(stop.info){
                    self.routeDetailLayer.remove(stop.info);
                }
            }

            function displayInfo(e){
                var stop = e.target.stopInfo;
           
                var info = new Microsoft.Maps.Infobox(new Microsoft.Maps.Location(stop.lat,stop.lon), { 
                    showCloseButton : false,
                    title : "<b>" + stop.routeTag  + "</b> <span class='tiny'>" + stop.direction_title + "</span>" });
               

                self.routeDetailLayer.push(info);
                stop.info = info;

            }

            // Todo, need some way to remove the event handlers for every stop on a route

            function displayEventInfo(e) {
                var stop = e.target.stopInfo;
                if(stop.info){
                    self.routeDetailLayer.remove(stop.info);
                    stop.info = null;
                }
                    
                $(self).trigger("stop_clicked", { stop: stop });
            }

            this.map.entities.push(this.routeDetailLayer);
        },

        show : function () {
            this.showLayers();
            this.isVisible = true;
            this.startVehicles();
            $(this).trigger('Starting')
        },
        hide : function(){
            this.hideLayers();
            this.stopVehicles();
            // Not sure about these ===============================================================<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
            $(this).trigger("Closing");
            $(this).trigger("Stopping");
        },
        showLayers : function () {
            if (this.routeDetailLayer) {
                this.routeDetailLayer.setOptions({ visible: true });
            }
            if (this.vehicleLayer) {
                this.vehicleLayer.setOptions({ visible: true });
            }
        },
        hideLayers: function () {
            this.routeDetailLayer.setOptions({ visible: false });
            this.vehicleLayer.setOptions({ visible: false })
        },
        stopVehicles: function () {
            if (this.vc !== null) 
                this.vc.stop();
            
        },
        startVehicles: function () {
            if (this.vc !== null)
                this.vc.start();
        }
    

    } // end of prototype




    function RouteDetailFetcher(routeTag, url) {
        this.routeTag = routeTag;
        this.paths = [];
        this.stops = [];
        this.url = url + routeTag;
    }

    RouteDetailFetcher.prototype = {
        fetchRoad: function () {
            var self = this;
            var obj = GenericFetcher.create(this.url, this.parseData, this);
            var prm1 = obj.fetch();

            prm1.done(function (data) {
                $(self).trigger("roadReceived", data);
            });
            prm1.fail(function (reason) {
                console.log("Something went wrong : [ RoadController.fetchRoad ]");
            });
        },
        parseData: function (data) {
            var self = this;     

            // Prob going to pull the color part out of here because the stops and path
            // are in one feed, so might try and create some class to contro lboth of these
            self.color = $(data).find('route').attr("color");

            $(data).find('route').children('stop').each(function (e) {
                var $this = $(this);
                var routeTag = self.routeTag;
                var tag = $this.attr('tag');
                var title = $this.attr('title');
                var lat = $this.attr('lat');
                var lon = $this.attr('lon');
                var stopId = $this.attr('stopId');
                var stop = new M.Stop(routeTag, self.title, title, tag, stopId, lat, lon);
                self.stops.push(stop);
            });

            var directionsList = [];

            $(data).find('direction').each(function(e){

                var $this = $(this);
                
                var o = {
                    title : $this.attr('title'),
                    tag : $this.attr('tag'),
                    name : $this.attr('name'),
                    stops : {}
                };

                $this.children('stop').each(function(e){
                    var $this = this;
                    o.stops[$this.getAttribute('tag')] = '_';
                });
                directionsList.push(o);
            });


            for(var i = 0; i < self.stops.length; i++){

                for(var k = 0; k < directionsList.length; k++){
                    if(self.stops[i].tag in directionsList[k].stops){
                        self.stops[i].title = directionsList[k].title;
                        self.stops[i].direction_title = directionsList[k].title;
                        continue;
                    }
                }

            }

            
            $(data).find("path").each(function (e) {
                var temp = [];
                $(this).find("point").each(function (e) {
                    var $this = $(this);
                    var point = new Point($this.attr("lat"), $this.attr("lon"));
                    temp.push(point);
                });
                self.paths.push(temp);
            });
            return { paths: self.paths, stops: self.stops };

        }

    };


    function Point(lat, lon) {
        this.lat = lat;
        this.lon = lon;
    }


    function Prediction(dirTag, mins, vehicle) {
        this.minutes = mins;
        this.vehicle = vehicle;
        this.dirTag = dirTag;
    }


   M.Stop = function(routeTag, routeTitle, title, tag, stopId, lat, lon, dir_title,dir_name,dir_tag,useForUI) {
        this.routeTag = routeTag || "Unknown";
        this.routeTitle = routeTitle;
        this.title = title || "Unknown";
        this.tag = tag || "Unknown";
        this.stopId = stopId || "Unknown";
        this.lat = lat || "Unknown";
        this.lon = lon || "Unknown";
        this.direction_title = dir_title || "Unknown";
        this.direction_name = dir_name || "Unknown";
        this.direction_tag = dir_tag || "Unknown";
        this.useForUI = useForUI;
    }

    function StopVehiclePredictions(config) {
        if (!config.stopTag)
            throw new Error("Need stop tag to get predicitions for");

        this.routeTag = config.routeTag;
        this.stopTag = config.stopTag;
        this.repeat = config.repeat;
        this.callback = config.callback;
        this.url = this.create_url(config);

    }


    StopVehiclePredictions.prototype = {
        constructor : StopVehiclePredictions,
        create_url : function(config){
            var url = "http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=sf-muni&r={{route}}&s={{stop}}&useShortTitles=true";

            if(config.routeTag){
                url = this.url.replace("{{stop}}", config.stopTag).replace("{{route}}", config.routeTag);
            }
            return url;
        }


    }

})(jQuery, MUNI);





////////////////////////////////////////////////////////////////////////////////////////////////
// VehicleController   :   Used by a route to fetch the vehicle location data for a route     //
//                         Called every 15 seconds until the route is closed by the user.     //
//                         Uses GenericFetcher and Repeater from helper.js for the repeated   //
//                         calls                                                              //
////////////////////////////////////////////////////////////////////////////////////////////////



function contructUrl(url, qs) {
    url = url + "?";
    for (var s in qs) {
        if (qs.hasOwnProperty(s)) {
            url += s + "=" + qs[s] + "&";
        }
    }
    return url;
}


function VehicleController(routeTag, url,operator) {
    // Set defaults if nothing passed in
    this.operator = operator || 'sf-muni';
    this.routeTag = routeTag || 'N';
    this.timer = 0;
    this.timeSince = 0;
    this.firstCall = true;
    this.baseurl = url;
    var obj = { command: "vehicleLocations", a: this.operator, t: this.timeSince, r: this.routeTag };
    this.url = contructUrl(url, obj);
    this.isStopped = true;
    this.vehiclesTable = {};  // This keeps a record of all vehicles, because muni api will return all vehicles on the first request,
    // but only vehicles that have updated in requests from there. So we have to update those vehicles
    // and send all vehciles to the Route Master for rendering.
    this.fetcher = GenericFetcher.create(this.url, this.parseReturnResults, this);
    this.repeater = new Repeater(this.fetcher,  15, this.getUrl.bind(this));
}

VehicleController.prototype.getUrl = function () {
    return this.url;
}


// Start fetching vehicle locatins from muni. Only run once, so anyother calls to start() while it is running
// will not result in a new query being sent.
VehicleController.prototype.start = function () {
    // Create a max time which is the time now plus 15 secs
    if (this.isStopped) {
        this.isStopped = false;
        this.repeater.start(true);
    }
};

VehicleController.prototype.stop = function () {
    this.isStopped = true;
    this.repeater.stop();
};



VehicleController.prototype.setUrl = function (params) {
    this.url = contructUrl(vehicleUrl, params);
};

VehicleController.prototype.parseReturnResults = function (results) {
    var self = this;
    if (!this.isStopped) {

        this.timeSince = $(results).find("lastTime").attr("time");

        $(results).find("vehicle").each(function (e) {
            var $this = $(this);

            var v = new Vehicle({
                id: $this.attr("id"),
                routeTag: $this.attr("routeTag"),
                dirTag: $this.attr("dirTag"),
                lat: $this.attr("lat"),
                lon: $this.attr("lon"),
                predictable: $this.attr("predictable"),
                heading: $this.attr("heading"),
                speed: $this.attr("speedKmHr")
            });

            self.vehiclesTable[v.id] = v;

        });

        // THIS IS A HACK HERE. WILL CHANGE. MAYBE USE SOME KIND OF PROPERTY
        var obj = { command: "vehicleLocations", a: this.operator, t: this.timeSince, r: this.routeTag };
        this.url = contructUrl(this.baseurl, obj);

        this.raiseVehiclesEvent(self.vehiclesTable);


    }
};

VehicleController.prototype.raiseVehiclesEvent = function (vehicles) {

    // Remove buses from the layer and add new bus to the layer
    // Maybe just raise an event here, so that the master Route 
    // can control displaying
    $(this).trigger("vehiclesReceived", [vehicles]);

};


function Vehicle(params) {
    this.id = params.id || "Not Set";
    this.routeTag = params.routeTag || "Not Set";
    this.dirTag = params.dirTag || "Not Set";
    this.lat = params.lat || "Not Set";
    this.lon = params.lon || "Not Set";
    this.heading = params.heading || "Not Set";
    this.predictable = params.predictable || false;
    this.speed = params.speed || "Not Set";

}


