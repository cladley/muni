var MUNI = MUNI || {};


(function ($,M) {

	var base_url = "http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=sf-muni&r={{routeTag}}&s={{stopTag}}&useShortTitles=true";

	M.StopPrediction = function(stopTag,routeTag){
		this.stopTag = stopTag;
		this.routeTag = routeTag;
		this.url = this.contructUrl(stopTag,routeTag);

		this.fetcher = GenericFetcher.create(this.url,this.parse_results, this);
		this.repeater = new Repeater(this.fetcher, 45, this.url);
	};

	M.StopPrediction.prototype = {
		constructor : M.StopPrediction,

		contructUrl : function(stopTag,routeTag){
			var url = base_url.replace('{{routeTag}}', routeTag)
							  .replace('{{stopTag}}', stopTag);

			return url;
		},
		parse_results : function(data){
			var predictions = {};
	
		
			predictions.routeTitle = $(data).find('predictions').attr('routeTitle');
			predictions.stopTitle = $(data).find('predictions').attr('stopTitle');

			$(data).find('direction').each(function(){
				predictions.title = $(this).attr("title");
				var temp = [];
				$(this).find('prediction').each(function(){
					var $this = $(this);
					var mins = $this.attr("minutes");
					var vehicle = $this.attr("vehicle");
					var dirTag = $this.attr("dirTag");
					
					var pred = {
						dirTag : dirTag,
						vehicle : vehicle,
						mins : mins
					};
					temp.push(pred);
				});

				predictions.predictions_list = temp;
			});
	

			$(this).trigger("new_predictions", predictions);
		},
		fetch : function(){
			if(this.repeater){
				this.repeater.start();
			}else{
				console.log("Repeater is not initialized...stop_prediction.js");
			}

		},
		stop : function(){
			if(this.repeater){
				this.repeater.stop();
			}
		}

	};

})(jQuery,MUNI);





//////////////////////////////////////////////////////////////////////////////////////////////
// StopPopup  : encapsulates the popbox box and the fetching of bus predication for a stop. //
// StopPrediction : fetches the predication information and continually fetches new         //
//                  predictions every 60 seconds                                            //
//////////////////////////////////////////////////////////////////////////////////////////////


var MUNI = MUNI	|| {};
MUNI.zIndex = 10000;


(function($,M){

	var popup_template = document.getElementById('stop_popup_template').innerHTML;
	var spinner = document.getElementById('spinner_html').innerHTML;

	M.StopPopup = function(stop,routeTag){
		this.stop = stop;
		this.stop.routeTag = routeTag;
		this.stop_predictor = new M.StopPrediction(stop.tag, routeTag);
		this.init();
	}

	M.StopPopup.prototype = {
		constructor : M.StopPopup,

		init : function(){
			var self = this;
			this.location = new Microsoft.Maps.Location(this.stop.lat,this.stop.lon);
		
			var options = { 
				width : 200, 
				title : "     Route " + this.stop.routeTag,
				description : this.constructHtml(),
				zIndex : ++M.zIndex
 			};

 			// Use Infobox which is a popup box supplied by Ms Maps. Customize it by
 			// giving it custom html for the description property
			this.popup = new Microsoft.Maps.Infobox(this.location, options);
			this.handlerId = Microsoft.Maps.Events.addHandler(this.popup, 'entitychanged', function(e){
			 	self.close();
			 });

			// Microsoft.Maps.Events.addHandler(this.popup, 'click', function(e){
			// 	var opts = self.popup.getOptions();
			// 	e.target._zIndex = ++M.zIndex;
			// 	console.log(e);
			// });


			// Start fetching predictions for a stop
			$(this.stop_predictor).on('new_predictions', this.predictions_received.bind(this));
			this.stop_predictor.fetch();
		},

		// Will be called every 60secs or so with new prediction data
		predictions_received : function(e,predictions){

		    // Grab the ul element from the infobox (popup), 
		    // and update it with new prediction data. 
			var p = predictions.predictions_list;
			var selector = 'ul.' + this.stop.stopId;
	        var $ul = $(selector);

			if(!p){
				var p = document.createElement("p");
				p.textContent = "No predictions available at this time";
				p.className = "error";
				$ul.empty();
				$ul.hide();
				$ul.append(p);
			}else{
				
	       	    var min_span = document.createElement("span");
	        	min_span.textContent = "minutes";
	    
 		    	$ul.empty();
	        	$ul.hide();

	        	for(var i = 0; i < p.length; i++){
	        		var li = document.createElement('li');
	        	
	        		if(p[i].mins == 0){
	        			li.innerHTML = "<span class='left'>arriving</span>";

	        		}else{
	        			li.innerHTML = '<span class="left">' + p[i].mins + '<span class="right">minutes</span>';
	        		}
	        		

	        		$ul.append(li);
	        	}


			}


	        

	        $ul.fadeIn(200);

		},

		constructHtml : function(){

			var html = popup_template.replace("TG-title-TG", this.stop.title)
									 .replace("TG-stopId-TG", this.stop.stopId)
									 .replace("TG-loading-TG", spinner);
			return html;
		},
		show : function(){
			this.repeater.start();
		},
		close : function(){
			this.stop_predictor.stop();
			Microsoft.Maps.Events.removeHandler(this.handlerId);
		}
	}


})(jQuery,MUNI);