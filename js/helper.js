///////////////////////////////////////////////
// Helper functions and jquery helper method //
///////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
// GenericFetcher  : Uses jQuery to send a ajax request                            //
// Repeater        : Used with the GenericFetcher to repeat a call to the          //
//                   GenericFetcher after some elapsed time specified by the user  //                 
/////////////////////////////////////////////////////////////////////////////////////

// Ajax request using jQuery. 
GenericFetcher = (function ($) {

    // parser is a function passed in by the user
    // to parse the returned data in the correct format
    function f(url, parser, context) {
        this.url = url,
        this.parser = parser;
        this.context = context;
    }

    // Using jQuery Deferred so that the user of this function will be returned
    // a Deferred object, so that they can reponsed when and ajax result returns
    f.prototype.fetch = function (url) {
        this.url = url || this.url;
        var self = this;
        var dfd = $.Deferred();

        function ajaxCall() {
            return $.ajax({
                url: this.url
            });
        }

        var prm = ajaxCall.call(this);

        prm.done(function (results) {

            var data = self.parser.call(self.context, results);
            dfd.resolve(data);
        });

        prm.fail(function (reason) {
            console.log("Failure in the Generic Fetcher");
            dfd.reject();
        });

        prm.complete(function (data) {
            dfd.resolve();
        });
        return dfd;
    }

    return {
        create: function (url, parserFunc, context) {
            var obj = new f(url, parserFunc, context);
            return obj;
        }

    };
})(jQuery);


// A function to continuously call the fetcher from above after
// a delay and repeats until user requests to stop
function Repeater(fetcher, delay, getUrl) {
    this.fetcher = fetcher;
    this.delay = delay;
    this.timelimit;
    this.initialCall = true;
    if (typeof getUrl !== "function") {
        this.getUrl = function () {
            return getUrl;
        }
    } else {
        this.getUrl = getUrl;
    }

    this._stop = false;
}

Repeater.prototype = {

    start: function (restart) {
        var self = this;
        var prm;
        if (restart !== undefined)
            this._stop = !restart;

        if (!this._stop) {

            if (this.initialCall) {
                this.initialCall = false;
                this.timelimit = new Date();
                this.timelimit.setSeconds(this.timelimit.getSeconds() + this.delay);

                prm = this.fetcher.fetch(this.getUrl());
                prm.done(function () {
                    self.start();
                });

            } else {

                var timeNow = new Date();
                if (timeNow < this.timelimit) {
                    var difference = this.timelimit - timeNow;
                    setTimeout(self.start.bind(self), difference);
                } else {
                    this.timelimit = new Date();
                    this.timelimit.setSeconds(this.timelimit.getSeconds() + this.delay);
                    prm = this.fetcher.fetch(this.getUrl());
                    prm.done(function () {
                        self.start();
                    });

                }

            }

        } else {
            console.log("Stopped");
        }

    },

    stop: function () {
        this._stop = true;
    }
}

// jQuery to create an animation that loops until user
// requests to stop it
jQuery.fn.loopAnimation = function (props,speed,oldprops){
            if(!oldprops){
                    var oldprops = {};
                for(var key in props){
                    oldprops[key] = this.css(key);  
                }
            }
            var self = this;

             this.animate(props, speed).animate(oldprops, speed, function(){
                 self.loopAnimation(props, speed,oldprops);
             });
             return this;
};