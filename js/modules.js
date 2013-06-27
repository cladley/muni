

CORE.create_module('initial-overlay', function(sb){
    var overlay;
    var btnskip;
    var btn_find_address;
    var btn_find_geo;
    var txtAddress;
    return {
        init : function(){
            overlay = sb.find('#initial-overlay','body')[0];
            btnskip= sb.find('#btn_skip')[0];
            btn_find_address = sb.find('#btn_find_address')[0];
            btn_find_geo = sb.find('#btn_find_geo')[0];
            txtAddress = sb.find('#txtAddress')[0];
          


            sb.addEvent(btnskip, 'click', this.hide.bind(this));
            sb.addEvent(btn_find_address, 'click', this.findAddress.bind(this));
            sb.addEvent(btn_find_geo, 'click', this.find_by_geo.bind(this));
        },
        destroy: function(){

        },


        hide : function(e){
      
            sb.addClass(overlay, 'hide');
        },
        show:function(e){
           
        },
        find_by_geo : function(){
           
            sb.notify({
                type: 'find-geo-location',
                data: {}
            });
            this.hide();
        },
        findAddress : function(e){
            var address = txtAddress.value.trim();
            if(!address)
                alert("I need an address");
            else{
                    sb.notify({
                        type: 'find-location',
                        data: { address: address }
                    });

                    this.hide();
            }
        }

    };

});



///////////////////////////////////////////////////
//                                               //
//      Route Selector                           //
//      - Displays available routes in sidebar   //
//                                               //
///////////////////////////////////////////////////

// First element is the id of the dom element which represents the module
// This module is responsible for downloading a list of all routes.
CORE.create_module('route-selector', function (sb) {
    var url = "http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=sf-muni";
    var selector_Container;
    var spinner_html;
    var route_cache = {};
    return {
        init: function () {
            selector_Container = sb.find('#route_list')[0];
            spinner_html = sb.getGlobal("spinner_html");
            
            sb.addEvent(selector_Container, 'click', this.route_selected.bind(this));

            this.get_routes();
            // We listen for events from other modules
            sb.listen({
                'route-loaded' : this.route_loaded.bind(this)
            });
        },

        create_spinner : function(){
            var spinner = document.createElement("div");
         
            spinner.setAttribute("class", "spinner");
            spinner.innerHTML = spinner_html;

            return spinner;
        },

        route_loaded: function (data) {
        
            if (route_cache[data.routeTag]) {
                var element = route_cache[data.routeTag];
                this.setState("loaded", element);
            }
        },

        route_selected: function (e) {


            var li = e.target;
            if(li.nodeName === 'LI'){
       
                var routeTag = li.id;
                if (!route_cache[routeTag]) {
                    // Notify other modules that a route has been selected
                    route_cache[routeTag] = li;
                    this.setState('loading', li);
                    
                    sb.notify({
                        type: 'route-selected',
                        data: { routeTag: routeTag }
                    });
                  
                } else {
                    // it could be loading already or loaded,
                    // so clicking it again will turn it off
                    this.setState('normal', li);
                    sb.notify({
                        type: "route-deselected",
                        data: { routeTag: routeTag }
                    });

                }  

            }         
        },

        setState: function (state, element) {
           
            switch (state) {
                case "loading":
                    element.appendChild(this.create_spinner());
                    element.setAttribute("class", "selected");
                    break;
                case "loaded":
                    var spinner = element.querySelector('div.spinner');
                    if(spinner)
                        element.removeChild(spinner);
                    break;
                case "normal":
                    var spinner = element.querySelector('div.spinner');
                    if (spinner) { element.removeChild(spinner);}
                    sb.removeClass(element, "selected");
                    delete route_cache[element.id];
                    break;
                default:
                    break;

            }
           
        },

        get_routes : function(){
            sb.fetch({
                url: url,
                callback: this.parse_data.bind(this),
                dataType : 'xml',
                onerror : this.onError
            });
        },
        parse_data : function(data){

            rules = {
                tagName: 'route',
                attributes: ['tag', 'title']
            };
            var items = sb.extract_xmlToObject(data, rules);

            items.forEach(function (item, index) {
                var li = sb.create_element('li', {
                    'id': item.tag,
                    'text': item.title,
                    'data-routeTag': item.tag
                });

                selector_Container.appendChild(li);
            });

        },

        retry : function(){
            if(this.retry.times){
                if(this.retry.times < 3){
                    this.retry.times += 1;
                    this.get_routes();

                }else{
                    alert("Something bad happened when I tried to fetch the routes table");
                    delete this.retry.times;
                }
            }else{
                this.retry.times = 0;
                this.retry();
            }
        },

        // Retry and send request 3 times
        onError: function () {
            this.retry();
        },

        destroy: function (data) {
            sb.removeEvent(selector_Container, "click");
        },

    }
});

///////////////////////////////////////////////////
//                                               //
//      Route Viewer                             //
//      - Displays routes, stops on top of map   //
//                                               //
///////////////////////////////////////////////////
CORE.create_module('route-viewer', function (sb) {
    var routesCache = {};
    var map;

    return {
        init: function () {
            map = sb.getGlobal("map");
            sb.listen({
                'route-selected' : this.route_selected,
                'route-deselected' : this.route_deselected,
            });
        },
        destroy: function () {

        },

        route_selected: function (data) {
            var routeTag = data.routeTag;
            var route;

            if (routesCache[routeTag]) {
           
                route = routesCache[routeTag];
                route.show();

                sb.notify({
                    type: 'route-loaded',
                    data : {routeTag : routeTag}
                });
            } else {
                
                route = new MUNI.Route(routeTag, map);
                route.init().done(function (routeTag) {
                    sb.notify({
                        type: 'route-loaded',
                        data: { routeTag: routeTag }
                    });
                });

                sb.addEvent(route,'stop_clicked',function(e,data){
                    sb.notify({
                        type: 'stop-selected',
                        data : { stop : data.stop, routeTag : route.routeTag}
                    });

                });

                routesCache[routeTag] = route;
            }

        },
        route_deselected: function (data) {
            var routeTag = data.routeTag;
            if (routesCache[routeTag]) {
                var route = routesCache[routeTag];
                route.hide();
            }
        }

    }


});

/////////////////////////////////////////////////////////
//                                                     //
//            Stops Viewer.                            //
//                                                     //
//                                                     //
/////////////////////////////////////////////////////////
// When user selects a stop, a popbox box is displayed 
// which has the detail for that stop. When this happens
// a new layer is created for that stop and that layer is
// associated with that route. If another stop for the same
// route is selected, then, that stop is added to the same 
// layer. When the route is closed, then the the Stpos Viewer
// is notified and the layer is removed from the stops viewer

CORE.create_module('stops-popup-view', function(sb){
    var map;
    var map_layer;
    var stopsCache = {};

    return {

        init : function(){
            map = sb.getGlobal('map');
            map_layer = new Microsoft.Maps.EntityCollection({ visible: false });


            sb.listen({
                'route-deselected' : this.hide_popups_for_route,
                'stop-selected' : this.show_popup
            });


        },
        destroy : function(){

        },
        hide_popups_for_route : function(data){
            if(stopsCache[data.routeTag]){
                stopsCache[data.routeTag].popups.forEach(function(stp,indx){
                    stp.close();
                });

                var layer = stopsCache[data.routeTag].maplayer;
                map.entities.remove(layer);
                delete stopsCache[data.routeTag];

            }

            
        },
        show_popup : function(data){
         
            var stop = new MUNI.StopPopup(data.stop,data.routeTag);
            var layer;
            if(stopsCache[data.routeTag]){
                stopsCache[data.routeTag].popups.push(stop);
                layer = stopsCache[data.routeTag].maplayer; 
            }else{
                layer = new Microsoft.Maps.EntityCollection();
                
                stopsCache[data.routeTag] = {
                    maplayer : layer,
                    popups : [stop]
                }
                map.entities.push(layer);
            }

            layer.push(stop.popup);
   
        }


    };

});


/////////////////////////////////////////////////////////
// Closest Stops Module -                              //
// With lat lon coordinates, it find all stop within   //
// a range rectangle. Its uses a 2dtree data-structure //
// for efficent search                                 //
/////////////////////////////////////////////////////////
CORE.create_module('closest_stops', function (sb) {
    var stops_tree;  // A 2dtree of the stops
    var map_layer;
    var all_stops = [];
    var location_data;
    var current_location;
    var map;
    var btn;


    return {

        init: function () {
            map = sb.getGlobal("map");
            map_layer = new Microsoft.Maps.EntityCollection({ visible: false });
            map.entities.push(map_layer);
            btn = sb.find("#btncloseststops", "body")[0];
            sb.addEvent(btn, 'click', this.get_stops_in_range.bind(this));
            sb.listen({
                'new-location' : this.new_location_set.bind(this)
            });

            this.load_all_stops();
        },
        destroy: function () {

        },
        new_location_set : function(data){
            location_data = data.location_data;
            var lat = location_data.point.coordinates[0];
            var lon = location_data.point.coordinates[1];
            current_location = new KDPoint(lat, lon);
        },

        create_catchment_rectangle: function (x, y, amount) {
            var amount = amount || 0.00400;
            var xmin = x - amount;
            var ymin = y - amount;
            var xmax = x + amount;
            var ymax = y + amount;
            return new Rect(ymin, xmin, ymax, xmax);
        },

        get_stops_in_range: function () {
            var catchrectangle = this.create_catchment_rectangle(current_location.lat, current_location.lon);
            var stopNodes = stops_tree.range(catchrectangle);
            
           
            map_layer.clear();
            var stops = [];
            stopNodes.forEach(function (stp, idx) {
                var stop = stp.stop;
                var pin = new Microsoft.Maps.Pushpin(new Microsoft.Maps.Location(stop.point.lat, stop.point.lon), { typeName: 'micro' });
                pin.stopInfo = stop;
               // Microsoft.Maps.Events.addHandler(pin, 'click', displayEventInfo);
                Microsoft.Maps.Events.addHandler(pin, 'mouseover', displayEventInfo);
                Microsoft.Maps.Events.addHandler(pin, "mouseout", removeInfo);
                map_layer.push(pin);
                stops.push(stop);
            });

            function removeInfo(e){
                var stop = e.target.stopInfo;
                if(stop.info){
                    map_layer.remove(stop.info);
                    stop.info = null;
                }
            }

            function displayEventInfo(e){
                var stop = e.target.stopInfo;
       
                var info = new Microsoft.Maps.Infobox(new Microsoft.Maps.Location(stop.lat,stop.lon), { 
                    showCloseButton : false,
                    title : "<b>" + stop.routeTag  + "</b> <span class='tiny'>" + stop.direction_title + "</span>" });
               

                map_layer.push(info);
                stop.info = info;
                // map.entities.push(new Microsoft.Maps.Infobox(new Microsoft.Maps.Location(51.50, -0.127), {title: 'London', description: 'description here', pushpin: pin2})); 

             // console.log(stop);
             // debugger;
             //      var stop = new MUNI.StopPopup(stop,stop.routeTag);
             //      map_layer.push(stop);
            }

            //     Microsoft.Maps.Events.addHandler(pin, 'click', displayEventInfo);
            //     self.routeDetailLayer.push(pin);
            // }

            // // Todo, need some way to remove the event handlers for every stop on a route

            // function displayEventInfo(e) {
            //     var stop = e.target.stopInfo;
            //     $(self).trigger("stop_clicked", { stop: stop });
            // }



            sb.notify({
               type : 'loading-walking-routes',
               data: {}
            })

       
            MUNI.get_walk_routes(current_location, stops.slice(0, 5))
               .done(function (data) {
                   sb.notify({
                       type: 'new-walking-routes',
                       data: { walking_routes : data }
                   });

               })
               .fail(function (reason) {
                   console.log("Get walk routes failed");
               });


            catchrectangle.draw(map_layer);
            this.show_layer();
        },
        get_closest_stop: function () {
            if (current_location === undefined)
                throw new Error("Need a location set to find a closest stop");
            var stpNode = stops_tree.nearest(current_location);
            var stop = stpNode.stop;
            var pin = this.create_pushpin(stop.lat, stop.lon);
       
         
            map_layer.push(pin);
            this.show_layer();
        },
       

        load_all_stops : function(){
            sb.fetch({
                url: 'allstops.json',
                dataType: "json",
                callback: this.parse_stops.bind(this),
                onerror : this.onerror
            });
        },

        // create_pushpin: function (lat, lon) {
        //     var loc = new Microsoft.Maps.Location(lat,lon);
        //     var pin = new Microsoft.Maps.Pushpin(loc, { typeName: 'micro' });
        //     //Microsoft.Maps.Events.addHandler(pin, 'click', displayEventInfo);
        //     return pin;
        // },



        parse_stops : function(data){
            data.forEach(function (stp, idx) {
 
                var s = new MUNI.Stop(stp.routeTag, '', stp.title, stp.tag, stp.stopId, 
                    stp.lat, stp.lon, stp.directionTitle, stp.directionName, 
                    stp.directionTag, stp.useForUI);
          
                all_stops.push(s);
            });
            this.init_2d_tree();
        },

        init_2d_tree: function () {
            stops_tree = new Kdtree();
            for (var i = 0; i < all_stops.length; i++) {
                stops_tree.insert(all_stops[i]);
            }
        },
        show_layer: function () {
            map_layer.setOptions({ visible: true });
        },
        hide_layer: function () {
            map_layer.setOptions({ visible: false });
        },
        remove_layer: function () {
            map.entities.remove(map_layer);
        },
        clear_layer: function () {
            map_layer.clear();
        },

    };

});


CORE.create_module('walking-route-controlll', function (sb) {
    var map;
    var map_layer;
    var accordion;
    var walking_routes;
    var current_selection;
    var stop_detail_template;
    var stop_prediction = null;
    var big_spinner_html;
    var container;
    var spinner;

    return {
        init: function () {
            map = sb.getGlobal("map");
            map_layer = new Microsoft.Maps.EntityCollection({ visible: false });
            accordion = sb.find('#accordion')[0];
            stop_detail_template = sb.find('#stop_detail_template', 'body')[0].innerHTML;
            container = sb.find('#walking-route-controlll', 'body')[0];
         
            big_spinner_html = sb.find('#big_spinner', 'body')[0].innerHTML;
    
            $(container).hide();

            var height = document.documentElement.clientHeight;
            if(height >= 799){
                $(accordion).css("height", "480px");
            }else{
                var newHeight = height / 2.1;
                $(accordion).css("height", newHeight + "px");
            }

            window.addEventListener('resize', function(e){
                var height = document.documentElement.clientHeight;
                var width = document.documentElement.clientWidth;
                    

                if(height >= 799){
                    $(accordion).css("height", "480px");
                }else{
                    var newHeight = height / 1.90;
                    $(accordion).css("height", newHeight + "px");
                }   

                                
            }, false);
            
            sb.addEvent(accordion, 'click', this.route_clicked.bind(this), 'a');
            
            sb.listen({
                'new-walking-routes' : this.new_routes.bind(this),
                'loading-walking-routes' : this.loading_walking_routes.bind(this)
               
            });
        },
        destroy: function () {
            sb.removeEvent(accordion, 'click', this.route_clicked);
            if(stop_prediction) stop_prediction.stop();

        },
        create_spinner : function(){
            spinner = document.createElement("div");
            
            spinner.innerHTML = big_spinner_html;
            spinner.style.paddingLeft = "62px";
            spinner.style.paddingTop = "40px";
            return spinner;
        },
        loading_walking_routes : function(){
            
            accordion.appendChild(this.create_spinner());
            $(container).show();
        },

        create_item : function(item,indx){
            var li = document.createElement('li'),
                a = document.createElement('a'),
                ul = document.createElement('ul');

                var tmpl = stop_detail_template.replace('TG-stpRoute-TG', item.stop.routeTag)
                                    .replace('TG-stpDistance-TG', Math.round(item.travDist * 100) / 100)
                                    .replace('TG-stpTitle-TG', item.stop.title)
                                    .replace('TG-stpDirection-TG', item.stop.direction_title);

      
                a.className += 'heading closed';
                a.innerHTML = tmpl;
                a.setAttribute('data-index',indx);
                li.appendChild(a);
                li.appendChild(ul);
            return li;
        },
        add_item : function(item, control, index){

            var i = this.create_item(item,index);
            control.appendChild(i);
        },
        new_routes : function(data){
            var self = this;
         
            $(container).animate({
                opacity: 0
            },1000, function(){
                console.log("Just faded out")
                self.clear_accordion();
                walking_routes = data.walking_routes;
                self.add_to_accordion(walking_routes);

            });

            
        },

        clear_accordion : function(){

            accordion.innerHTML = "";
        },
    
        add_to_accordion : function(data){
            var self = this;
            for (var i = 0; i < data.length; i++)
                this.add_item(data[i], accordion,i); 

            $(container).animate({
                opacity : 1
            }, 1000)

        },

        setState : function(item,state,preds_list){

            switch(state){
                case 'loading':
                    this.onLoading(item);
                    break;
                case 'opened':
                    console.log("In opened");
                    this.onOpened(item,preds_list);
                    break;
                case 'updating':
                    console.log("In updating");
                    this.onUpdate(item,preds_list);
                    break;
                case 'closed':
                    this.onClosed(item);
                    break;

            }

        },

        onLoading : function(item){
            var $item = $(item);
            var $ul = $item.siblings('ul');
            var li = document.createElement("li");
            li.textContent = "Loading";
           
            $ul.append(li);
            $ul.slideDown('fast');

            $(li).loopAnimation({
                opacity : 0.1,
        
            }, 300);
            $item.removeClass('closed').addClass('loading');
        },
      
        onClosed : function(item){
            var $ul = $(item).siblings('ul');
            $(item).removeClass('loading').removeClass('opened').addClass('closed');
            $ul.slideUp('fast', function(){
                $(this).text("");
            });
            $ul.empty();
            
      
        },
        onUpdate : function(item,preds_list){
            var $ul = $(item).siblings('ul');
            var lis = $ul.children().slice(1, 5);
           
            var docfrag = document.createDocumentFragment();
            var li = document.createElement('li');
            li.textContent = "Next Due in";
            docfrag.appendChild(li);
            preds_list.forEach(function(p,i){
                var li = document.createElement('li');
                li.textContent =  p.mins + " minutes";
                docfrag.appendChild(li);
            });

            $ul.empty().append(docfrag);
        },

        onOpened : function(item,preds_list){
            var $ul = $(item).siblings('ul');
            var l = $ul.children().eq(0);

            // Stop the loading loopAnimation
            $(l).stop(true,false);

            // Calculate the height so we know how far to animate the ul sliding down
            // Put a magic number in here. MUST CHANGE
            var new_height = 27 * (preds_list.length + 1);
           
            $(item).removeClass('closed').removeClass('loading').addClass("opened");

            var li = document.createElement('li');
            li.textContent = "Next Due in";

            var docfrag = document.createDocumentFragment();
            docfrag.appendChild(li);
            preds_list.forEach(function(p,i){
                var li = document.createElement('li');
                li.textContent =  p.mins + " minutes";
                docfrag.appendChild(li);
            });

            $(docfrag).hide();

             $ul.animate({
                height : new_height + "px"
             }, 300, 'swing', function(){
                $ul.empty().hide().append(docfrag).fadeIn();
             });

         
        },
        
        route_clicked: function (e) {
            var self = this;
            var a = e.currentTarget;
            var indx = a.getAttribute('data-index');
            var wroute = walking_routes[indx];
            this.draw_walking_route(wroute);

            if($(a).hasClass('closed')){
                this.setState(a, 'loading');
                if(current_selection)
                    this.setState(current_selection, 'closed');
                current_selection = a;
                
                var indx = a.getAttribute('data-index');
                var item = walking_routes[indx];

                if(stop_prediction)
                    stop_prediction.stop();


                stop_prediction = new MUNI.StopPrediction(item.stop.tag,item.stop.routeTag);
                $(stop_prediction).on('new_predictions', function(e, preds){
                    self.predictions_received(preds);
                });
                stop_prediction.fetch();
            }

        },
        predictions_received : function(predictions){
            if($(current_selection).hasClass('loading')){
                this.setState(current_selection, 'opened', predictions.predictions_list);
                
            }else if($(current_selection).hasClass('opened')){
                this.setState(current_selection, 'updating', predictions.predictions_list);
            }
            
        },

        draw_walking_route : function(route){
            this.clear_layer();
            var points = [];
            route.itineraryItems.forEach(function(item, idx){
                 var loc = new Microsoft.Maps.Location(item.lat,item.lon);
                 points.push(loc);

            });
            var poly = new Microsoft.Maps.Polyline(points, { strokeColor : new Microsoft.Maps.Color(255, 255, 255, 255)});
            var loc = new Microsoft.Maps.Location(route.stop.lat, route.stop.lon);       //16     //16
            var pin = new Microsoft.Maps.Pushpin(loc, { state : Microsoft.Maps.EntityState.selected, zIndex : 9998});
            map_layer.push(pin);
            map_layer.push(poly);
            map.entities.push(map_layer);
            this.show_layer();
           
        },


        show_layer: function () {
            map_layer.setOptions({ visible: true });
        },
        hide_layer: function () {
            map_layer.setOptions({ visible: false });
        },
        remove_layer: function () {
            map.entities.remove(map_layer);
        },
        clear_layer: function () {
            map_layer.clear();
        },

    };

});


///////////////////////////////////////////////////
// Locations Module -                            //
// get lat lon for user address and vice versa   //                                  
///////////////////////////////////////////////////                                                                                  
CORE.create_module('locations-retriever', function (sb) {

    var locations_container;
    var txtAddress;
    var btnAddress;
    var txtAddressDetail
    var btnGeolocation;
    var choice_overlay;
    var choice_box;
    var button_spinner_html;
    var spinner_element;


    return {

        init: function () {
            MUNI.setApiKey(sb.getGlobal("api_key"));
            MUNI.setDefaults({
                country: 'US',
                state: 'CA',
                locality : "San Francisco"
            });

            // THIS IS ONLY FOR TESTING 
            sb.listen({
                'new-location': this.display_address_detail.bind(this),
                'find-location' : this.get_location.bind(this),
                'find-geo-location' : this.get_location_geo.bind(this)
            });



            txtAddress = sb.find('#txtaddress')[0];
            btnAddress = sb.find("#btnaddress")[0];
            txtAddressDetail = sb.find('#txtAddressDetail')[0];
            btnGeolocation = sb.find("#btnGeolocation")[0];
            choice_overlay = sb.find("#choice-overlay", "body")[0];
            choice_box = sb.find("#choice-box","body")[0];
            button_spinner_html = sb.find('#button_spinner', 'body')[0].innerHTML;
            
            // Create spinner element by injecting the html into a temporary div
            // and taking the first child out again
            var temp_div = document.createElement('div');
            temp_div.innerHTML = button_spinner_html;
            spinner_element = temp_div.firstElementChild;


            sb.addEvent(btnAddress, 'click', this.get_location.bind(this));
            sb.addEvent(btnGeolocation, 'click', this.get_location_geo.bind(this));
        },

        destroy: function () {
            sb.removeEvent(btnAddress, 'click', this.get_location);
            sb.removeEvent(btnGeolocation, 'click', this.get_location_geo);
            txtAddress = null;
            btnAddress = null;
            btnGeolocation = null;
            choice_overlay = null;
            choice_box = null;
        },
        get_location_geo: function () {
            btnGeolocation.insertBefore(spinner_element, btnGeolocation.firstChild);
            navigator.geolocation.getCurrentPosition(this.geo.bind(this));
        },
        geo: function (position) {
            var lat, lon;
            var self = this;



            if (sb.isDebug()) {
                lat = 37.795153;
                lon = -122.418444;
            } else {
                lat = position.coords.latitude;
                lon = position.coords.longitude;
            }
  
            var findAddress = new MUNI.FindAddressByPoint({ lat: lat, lon: lon });
            var prm = findAddress.fetch();
            this.handle_location_data(prm);
           
        },

        display_address_detail: function (data) {
            var address = data.location_data.address;
            var addressList = address.formattedAddress.split(/\s*,\s*/);
            var str = addressList.join(', ');
            txtAddress.value = str;

        },


        handle_location_data: function (promise) {
            var self = this;
            promise.done(function (data) {
                // 2. Remove the loading animatin from the button here

                // Using a try catch because I try to remove the spinner_element
                // from both buttons, and since one of the buttons won't contain
                // it, then it will throw and error
                try{
                     btnAddress.removeChild(spinner_element);
                }catch(e){
                     btnGeolocation.removeChild(spinner_element);              
                }

                window.data = data;
                if (data.statusCode !== 200) {
                    // ERRRRRRRROR
                } else {
                 
                    var obj = data.resourceSets[0];

                    if (obj.resources.length > 1) {
                        self.create_choices(obj.resources);
                        // Then show the the overlay. setup the event handlers,
                        self.show_choice_overlay();

                    } else {
                        sb.notify({
                            type: 'new-location',
                            data: { location_data: obj.resources[0] }
                        });
                    }
                }
            });

            promise.fail(function () {

            });
        },

        get_location: function (e) {
           
            var self = this;
            var val;
        
            if(e.address){
                val = e.address;
                txtAddress.value = val;
            }else{
                val = txtAddress.value.trim();
            }
           
            if (!val) {
                alert("Need some input");
                return;
            }


            // 1.  Add the loading animation to the button here
    
            var btn = e.target;
            
            if(!btn)
                btn = btnAddress;

            btn.insertBefore(spinner_element, btn.firstChild);
            
       
            
            var findAddress = new MUNI.FindByAddress({ address: val });
            var prm = findAddress.fetch();
            this.handle_location_data(prm);      
        },

        create_choices : function(data){
            var i;
            var length = data.length;
            choice_box.innerHTML = "";

            var h5 = document.createElement('h5');
            h5.textContent = "Please choose a location";
            h5.style.color = "white";
            h5.style.paddingLeft = "10px";
            choice_box.appendChild(h5);

            for (i = 0; i < length; i++) {
                var entry = sb.create_element("button", {
                    id: "choice-" + i,
                    text : data[i].name,
                    'class' : 'btn btn-info'
                });
                entry.addressObject = data[i];
                choice_box.appendChild(entry);
                   
            }
            sb.addEvent(choice_box, 'click', this.handle_choice_made.bind(this), 'button');
        },

        handle_choice_made : function(e){

            sb.notify({
                type: 'new-location',
                data: { location_data : e.currentTarget.addressObject}
            });
            sb.removeEvent(choice_box, 'click', this.handle_choice_made);
            this.hide_choice_overlay();
        },
        show_choice_overlay: function () {
            sb.addClass(choice_overlay, "show");
        },
        hide_choice_overlay: function(){
            sb.removeClass(choice_overlay, "show");
        }  
    };

});

///////////////////////////////////////////////////
// Location Layer Module -                       //
// Displays user on the map with a pushpin       //
///////////////////////////////////////////////////
CORE.create_module('location-layer', function (sb) {
    var map_layer;
    var map;
   
    return {
        init: function () {
            map_layer = new Microsoft.Maps.EntityCollection({ visible: false });
            map = sb.getGlobal("map");
            sb.listen({
                'new-location' : this.show_location.bind(this)
            });

        },
        destroy: function () {
            map_layer = null;

        },
        show_location: function (data) {
            this.remove_layer();
            this.clear_layer();
            var lat, lon;         
            var location = data.location_data;

            point = location.point,
            lat = point.coordinates[0],
            lon = point.coordinates[1];
            
            var loc = new Microsoft.Maps.Location(lat, lon);  
            var options = map.getOptions();

            options.zoom = 15;
            options.center = loc;

            pushpin = this.create_pushpin(lat, lon);
            map_layer.push(pushpin);
            map.entities.push(map_layer);
            this.show_layer();
            map.setView(options);
        },
        show_layer : function(){
            map_layer.setOptions({ visible: true });
        },
        hide_layer : function(){
            map_layer.setOptions({ visible: false });
        },
        remove_layer : function(){
            map.entities.remove(map_layer);
        },
        clear_layer : function(){
            map_layer.clear();
        },
        create_pushpin : function(lat,lon){
            var location = new Microsoft.Maps.Location(lat, lon);
            var pushpin = new Microsoft.Maps.Pushpin(location, { zIndex: 9999 });
            return pushpin;
        }

    };

});