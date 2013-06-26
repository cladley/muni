//////////////////////////////////////////////////////////////////////////////////////////
// FindByAddress  : Uses bing rest api to return lat lon coordinates of an address      //
// FindAddressByPoint : Uses bing rest api to return an address for lat lon coordinates //
//////////////////////////////////////////////////////////////////////////////////////////



var MUNI = MUNI || {};

(function ($, M) {

    var apikey = "";
    // use bing rest api to get an address for lat lon coordinates, or get lat lon coordinates for an address
    var base_url = "http://dev.virtualearth.net/REST/v1/Locations/{{country}}/{{state}}/{{zip}}/{{locality}}/{{address}}?key={{apikey}}";
    var base_point_url = "http://dev.virtualearth.net/REST/v1/Locations/{{lat}},{{lon}}?key={{apikey}}";

    // default options
    var _country, _state, _locality;
    //      CA   San Francisco  
   // adminDistrict / postalCode / locality / addressLine
    M.FindByAddress = function (options) {
        this.country = options.country || _country || '';
        this.state = options.state || _state || '';
        this.locality = options.locality || _locality || '';
        this.zip = options.zip || '-';
        this.address = options.address || '';

        this.construct_url.call(this);
    }

    M.setDefaults = function (options) {
        _country = options.country || '';
        _state = options.state || '';
        _locality = options.locality || '';
    },

    M.FindByAddress.prototype = {
        constructor: M.FindByAddress,

        construct_url: function () {
            var self = this;
            var url = base_url.replace(/{{country}}/i, replacer)
                        .replace(/{{state}}/i, replacer)
                        .replace(/{{zip}}/i, replacer)
                        .replace(/{{locality}}/i, replacer)
                        .replace(/{{address}}/i, replacer)
                        .replace(/{{apikey}}/i, apikey);
      

            // We have to encode and address so that it can be sent in a url
            function replacer(match) {
                var attr = match.slice(2, -2);
                return encodeURIComponent(self[attr]);
            }
            return url;
        },

        fetch: function () {
            var url = this.construct_url();
            var t = $.ajax({
                type: "GET",
                url: url,
                dataType: 'jsonp',
                jsonp: 'jsonp',
                success: function (response) {
                    //console.log(response);
                }
            });
            return t;
        },
       
    };

    M.FindAddressByPoint = function (options) {
        if (!options.lat || !options.lon) {
            throw new Error("Need both lat and lon coordinates to find location");
        }
        this.lat = options.lat;
        this.lon = options.lon;
    };

    M.FindAddressByPoint.prototype = {
        constructor: M.FindAddressByPoint,
        construct_url: function () {
            var url = base_point_url.replace(/{{lat}}/i, this.lat)
                                    .replace(/{{lon}}/i, this.lon)
                                    .replace(/{{apikey}}/i, apikey);
            return url;
        },
        fetch: function () {
            var url = this.construct_url();
            var t = $.ajax({
                type: "GET",
                url: url,
                dataType: 'jsonp',
                jsonp: 'jsonp',
                success: function (response) {

                }
            });
            return t;
        }
    }

    M.setApiKey = function (key) {
        M.apikey = key;
        apikey = key;
    };

})(jQuery, MUNI);





(function ($, M) {
    var base_url = "http://dev.virtualearth.net/REST/V1/Routes/Walking?wp.0={{fromlat}},{{fromlon}}&wp.1={{tolat}},{{tolon}}&optmz=distance&output=json&key={{apikey}}"

    var constructUrl = function (from, to) {
        var url = base_url.replace('{{fromlat}}', from.lat)
                            .replace('{{fromlon}}', from.lon)
                            .replace('{{tolat}}', to.lat)
                            .replace('{{tolon}}', to.lon)
                            .replace('{{apikey}}', M.apikey);
        return url;
    }


    M.get_walk_routes = function (from, stops) {
        var defer = $.Deferred();
        var awaiting = [];
        var from = {
            lat : from.lat,
            lon: from.lon
        };

        if (stops && !Array.isArray(stops))
            stops = [stops];
   
        stops.forEach(function(stop,idx){
            var prm = get_route(from,stop);
            awaiting.push(prm);
        });

        $.when.apply(null,awaiting).then(function () {
            defer.resolve(arguments);
        });

        return defer.promise();
    }

    get_route = function(from,stop){
        var defer = $.Deferred();
        var to = {
            lat: stop.lat,
            lon: stop.lon
        };


        var dfd = $.ajax({
            type : 'GET',
            url : constructUrl(from,to),
            dataType: 'jsonp', 
            jsonp: 'jsonp'
        });

        dfd.done(function(data){
            var wroute = parse_data(data);
            wroute.stop = stop;
            defer.resolve(wroute);
        });
        dfd.fail(function(reason){
            defer.reject();
        });

        return defer.promise();
    }

    parse_data = function (data) {
   
        var resources = data.resourceSets[0];
        var resource = resources.resources[0];
        var bbox = resource.bbox;
        var distUnit = resource.distanceUnit;
        var durUnit = resource.durationUnit;
        var travDist = resource.travelDistance;
        var travDur = resource.travelDuration;
        var leg = resource.routeLegs[0];
        var itineraryItems = [];

        leg.itineraryItems.forEach(function(item,idx){
            var obj = {
                lat : item.maneuverPoint.coordinates[0],
                lon : item.maneuverPoint.coordinates[1],
                instruction : item.instruction.text
            };
            itineraryItems.push(obj);
        });

        return new WalkingRoute({
            bbox: bbox,
            distUnit : distUnit,
            durUnit: durUnit,
            travDist: travDist,
            travDur: travDur,
            itineraryItems : itineraryItems
        });

    }

    function WalkingRoute(config) {
        this.bbox = config.bbox || null;
        this.distUnit = config.distUnit || null;
        this.durUnit = config.durUnit || null;
        this.travDist = config.travDist || null;
        this.travDur = config.travDur || null;
        this.itineraryItems = config.itineraryItems || null;
    }


})(jQuery, MUNI);