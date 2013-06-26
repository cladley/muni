var SANDBOX = {

    create: function (core, module_id) {
        var CONTAINER = core.dom.query('#' + module_id);

        return {

            find: function (selector,context) {
                if(context)
                    return core.dom.query(selector,context);
                else
                    return CONTAINER.query(selector);
            },
            fetch: function (config) {
                core.net.fetch(config);
            },

            listen : function(evts){
                core.register_events(evts, module_id);
            },
            notify: function (evt) {
                if (evt.type) {
                    core.raise_event(evt);
                }
            },

            addEvent: function (element, evt, fn, delegate_target) {
                var dt = delegate_target || null;
                core.dom.on(element, evt, fn, dt);
            },

            removeEvent : function(element,evt, handler){
                core.dom.off(element, evt, handler);
            },

            getGlobal: function (key) {
                return core.get_global(key);
            },

            addClass : function(element, className){
                core.dom.addClass(element, className);
            },

            removeClass : function(element, className){
                core.dom.removeClass(element, className);
            },

            isDebug : function () {
                return core.debug();
            },
            isNumber : function(i){
                return core.isNumber(i);
            },

            extract_xmlToObject: function (data, rules) {
                return core.utils.xmlToObject(data, rules);
            },

           
            create_element: function (el, config) {
                var i;
                var text;
                var el = core.dom.create(el);
                if (config) {
                    if (config.children && core.is_arr(config.children)) {
                        i = 0;
                        while (config.children[i]) {
                            el.appendChild(config.children[i]);
                            i++;
                        }
                        delete config.children;
                    } else if (config.text) {
                        text = document.createTextNode(config.text);
                        delete config.text;
                        el.appendChild(text);
                    }
                    core.dom.apply_attrs(el, config);
                }
                return el;

            },

        }
    }

};