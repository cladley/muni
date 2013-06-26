var CORE = (function ($){

    var moduleRepository = {};
    var globalObjects = {};
    var debugMode = false;

    return {
        // Module is created and added to the moduleRepository. SANDBOX which target the 
        // modules Dom element is also created
        create_module: function (moduleID, module_creator) {
            var temp;

            if (this.isString(moduleID) && this.isFunction(module_creator)) {
                var tempMod = module_creator(SANDBOX.create(this, moduleID));

                if (tempMod.init && tempMod.destroy) {
                    moduleRepository[moduleID] = {
                        create: module_creator,
                        instance : null
                    };

                } else {
                    console.log("Module \"" + moduleID + "\" need a init method and a destroy method");
                }
            } else {
                console.log("Module \"" + moduleID + "\" FAILED TO Loaded. Check your module settings");
            }
        },
        debug : function(option){
            if(option){
                debugMode = option
            }else{
                return debugMode;
            }
        },

        start: function (moduleID) {
            if (moduleRepository[moduleID]) {
                var mod = moduleRepository[moduleID];
                mod.instance = mod.create(SANDBOX.create(this, moduleID));
                mod.instance.init();
            }
        },
        start_all: function () {
            for (var moduleID in moduleRepository) {
                if (moduleRepository.hasOwnProperty(moduleID)) {
                    this.start(moduleID);
                }
            }
             
        },
        add_global : function(obj){
            globalObjects[obj.key] = obj.value;
        },
        get_global : function(key){
            return globalObjects[key];
        },

        register_events : function(evts, moduleID){
            if(moduleRepository[moduleID]){
                moduleRepository[moduleID].events = evts;
            }else{
                console.log("Unable to register event for module " + moduleID);
            }

        },

        raise_event : function(evt){
            for(var mod in moduleRepository){
                if(moduleRepository.hasOwnProperty(mod)){
                    var module = moduleRepository[mod];
                    if(module.events && module.events[evt.type]){
                        module.events[evt.type](evt.data);
                    }
                }
            }
        },

  

        // DOM related
        dom : {
            // Create an obj that will be parent of all queries in a module. It will only target
            // Dom elements under the particular module. Uses Closure to remember the element
            // it will perform queries on.
            query : function(selector, context){
                var $Element;
                var obj = {};
                var self = this;
                // If context is a jQuery element
                if(context && context.find){
                    $Element = context.find(selector);
                }else{
                    $Element = $(selector);
                }
                obj = $Element.get();
                obj.length = $Element.length;
                obj.query = function(sel){
                    return self.query(sel, $Element);
                };
                return obj;

            },

            // Handle dom events
            on: function (element, evt, fn, delegate_target) {
                var dt = delegate_target || null;
                $(element).on(evt, delegate_target, fn);
            },

            off : function(element, evt, handler){
                $(element).off(evt, handler);
            },

            create: function (element) {
                return document.createElement(element);
            },
            apply_attrs: function (el, attrs) {
                $(el).attr(attrs);
            },
            removeClass: function (el, className) {
                $(el).removeClass(className);
            },
            addClass: function (el, className) {
                $(el).addClass(className);
            }
        },


        net : {
            fetch : function(config){
                var ajax = $.ajax({
                    type:  "GET",
                    url: config.url,
                    dataType: config.dataType,
                });

                ajax.done(function(data){
                    config.callback(data);
                });

                ajax.fail(function(reason){


                });
                ajax.always(function(){

                });
                
            }



        },


        utils: {
            xmlToObject: function (data, rules) {
                var items = [];
                $(data).find(rules.tagName).each(function () {
                    var $this = $(this);
                    var o = {};
                    if (rules.attributes) {
                        for (var i = 0; i < rules.attributes.length; i++) {
                            o[rules.attributes[i]] = $this.attr(rules.attributes[i]);
                        }
                    }
                    items.push(o);
                });
                return items;
            }

        },


        

        














        isArray: function (obj) {
            return obj instanceof Array;
        },
        isFunction: function (obj) {
            return obj instanceof Function;
        },
        isString : function(obj){
            return typeof obj === "string";
        },
        isNumber: function (obj) {
            return typeof obj === "number";
        }

    }// end of return
})(jQuery);