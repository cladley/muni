/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// KDPoint : represents a lat lon coordinate, with the ability to draw itself on a map using pushpins      //
// Rect    : used within the 2D Tree to split the coordinates into containing rectangles                   //
// KdTree  : Binary tree data structure used for 2d coordinates. Provides fast range and closest           //
//           neighbours search.                                                                            //
// Node    : Represent a node in the KdTree. Has stop info, lat,lon coordinates and pointers to left and   //
//         : right children                                                                                //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////



function KDPoint(lat,lon) {
    this.lat = parseFloat(lat);
    this.lon = parseFloat(lon);
    
}

KDPoint.prototype = {
    x: function () { return this.lon; },
    y: function () { return this.lat; },
    // Just going to use pushpins here for debugging
    draw: function (micro) {
        if (micro) {
            var pp = new Microsoft.Maps.Pushpin(new Microsoft.Maps.Location(this.y(), this.x()), { typeName: 'micro' });
        } else {
            var pp = new Microsoft.Maps.Pushpin(new Microsoft.Maps.Location(this.y(), this.x()));
        }
      
        map.entities.push(pp);
    },
    distanceTo: function (that) {
        var dx = this.x() - that.x();
        var dy = this.y() - that.y();
        return Math.sqrt(dx * dx + dy * dy);
    },
    equals : function(that){
        if(this.x() === that.x() && this.y() === that.y()) return true;
        else return false;
    }

};

var r = new Rect(-122.514725, 37.682734, -122.369843, 37.834192);


function Rect(xmin, ymin, xmax, ymax) {
    this.lonMin = xmin;  // xmin
    this.latMin = ymin;  // ymin
    this.lonMax = xmax; // xmax
    this.latMax = ymax; // ymax
}



Rect.prototype = {

    width: function () {
        return this.lonMax - this.lonMin;
    },
    height: function () {
        return this.latMax - this.latMin;
    },
    xmin : function(){
        return this.lonMin;
    },
    xmax : function(){
        return this.lonMax;
    },
    ymin : function(){
        return this.latMin;
    },
    ymax : function(){
        return this.latMax;
    },
    distanceTo : function(point){
        return Math.sqrt(this.distanceSquaredTo(point));
    },
    distanceSquaredTo : function(point){
        var dx = 0.0;
        var dy = 0.0;
        if (point.x() < this.xmin()) dx = point.x() - this.xmin();
        else if (point.x() > this.xmax()) dx = point.x() - this.xmax();
        if (point.y() < this.ymin()) dy = point.y() - this.ymin();
        else if (point.y() > this.ymax()) dy = point.y() - this.ymax();
        return dx * dx + dy * dy;
    },
    intersects : function(that){
        return (this.xmax() >= that.xmin() && this.ymax() >= that.ymin() && that.xmax() >= this.xmin() && that.ymax() >= this.ymin());
    },
    contains : function(p){
        return (p.x() >= this.xmin() && p.x() <= this.xmax() && p.y() >= this.ymin() && p.y() <= this.ymax());
    },

    // For debug purposes only
    draw: function (map) {

        var Loc = new Microsoft.Maps.Location;
       
        var options = {
            fillColor: new Microsoft.Maps.Color(100, 95,153,204),
            strokeThickness: 0.5
        };

        var polygon = new Microsoft.Maps.Polygon([new Microsoft.Maps.Location(this.latMin, this.lonMin), new Microsoft.Maps.Location(this.latMin, this.lonMax),
            new Microsoft.Maps.Location(this.latMin, this.lonMax), new Microsoft.Maps.Location(this.latMax, this.lonMax), new Microsoft.Maps.Location(this.latMax, this.lonMax), new Microsoft.Maps.Location(this.latMax, this.lonMin), new Microsoft.Maps.Location(this.latMax, this.lonMin), new Microsoft.Maps.Location(this.latMin, this.lonMin)], options);

        var line1 = new Microsoft.Maps.Polyline([new Microsoft.Maps.Location(this.latMin, this.lonMin), new Microsoft.Maps.Location(this.latMin, this.lonMax)],options);
        var line2 = new Microsoft.Maps.Polyline([new Microsoft.Maps.Location(this.latMin, this.lonMax), new Microsoft.Maps.Location(this.latMax, this.lonMax)], options);
        var line3 = new Microsoft.Maps.Polyline([new Microsoft.Maps.Location(this.latMax, this.lonMax), new Microsoft.Maps.Location(this.latMax, this.lonMin)], options);
        var line4 = new Microsoft.Maps.Polyline([new Microsoft.Maps.Location(this.latMax, this.lonMin), new Microsoft.Maps.Location(this.latMin, this.lonMin)], options);
 
        map.push(polygon);

    }
}


function Node(stop) {
    this.point = new KDPoint(stop.lat, stop.lon);
    this.rect;
    this.stop = stop;
    this.lb;
    this.rt; 
}


function Kdtree() {
    this.root;
    this.stack = [];
    this.size = 0;
}

Kdtree.prototype = {

    isEmpty: function () {
        return this.size === 0;
    },

    onXCoord : function(q, p){
        if (p.x() < q.x())
            return -1;
        if (p.x() > q.x())
            return +1;
        return 0;
    },
    onYCoord : function(q,p){
        if (p.y() < q.y())
            return -1;
        if (p.y() > q.y())
            return +1;
        return 0;
    }, // This is the coordinates for san francisco
    main_rect: new Rect(-122.54, 37.70, -122.36, 37.84),

    insert : function(stop){
        // Stick a point object onto the stop object. Used within the kdtree
        
        stop.point = new KDPoint(stop.lat, stop.lon);
        this.root = this._insert(this.root, stop, true, this.main_rect);
    },
    _insert: function (node, stop, onX, rect) {
        var cmp;
        if (node === undefined) {
           
            n = new Node(stop);
            n.rect = rect;
            this.size += 1;
            this.stack.push(n);
            return n;
        }

        if (node.point.equals(stop.point)) return node;

        if (onX) {
            onX = false;
            cmp = this.onXCoord(node.point, stop.point);

            if (cmp < 0) {
                if (node.lb !== undefined)
                    node.lb = this._insert(node.lb, stop, onX, node.lb.rect);
                else
                    node.lb = this._insert(node.lb, stop, onX, new Rect(rect.xmin(), rect.ymin(), node.point.x(), rect.ymax()));
            } else if (cmp >= 0) {
                if (node.rt !== undefined)
                    node.rt = this._insert(node.rt, stop, onX, node.rt.rect);
                else
                    node.rt = this._insert(node.rt, stop, onX, new Rect(node.point.x(), rect.ymin(), rect.xmax(), rect.ymax()));

            }

        } else {
            onX = true;
            cmp = this.onYCoord(node.point, stop.point);

            if (cmp < 0) {
                if (node.lb !== undefined)
                    node.lb = this._insert(node.lb, stop, onX, node.lb.rect);
                else
                    node.lb = this._insert(node.lb, stop, onX, new Rect(rect.xmin(), rect.ymin(), rect.xmax(), node.point.y()));
            } else if (cmp >= 0) {
                if (node.rt !== undefined)
                    node.rt = this._insert(node.rt, stop, onX, node.rt.rect);
                else
                    node.rt = this._insert(node.rt, stop, onX, new Rect(rect.xmin(), node.point.y(), rect.xmax(), rect.ymax()));
            }
        }
        return node;
    },

    draw: function () {
        this.stack.forEach(function (item, idx) {
            item.point.draw(true);
            //item.rect.draw();
        });
    },
    // Gets the nearest point to passed in point
    nearest: function (point) {
     
        this._closest_distance = 9999.99;
        this._nearest(this.root, point);
        return this._closestNode;
    },



    _nearest: function (x, point) {

        var dist = x.point.distanceTo(point);

        if (dist < this._closest_distance) {
            this._closest_distance = dist;
            this._closestNode = x;
        }

        if (x.lb === undefined && x.rt === undefined) return;

        if (x.rect.distanceTo(point) < this._closest_distance) {

            if (x.lb !== undefined && x.rt !== undefined) {
                var lb_dist = x.lb.rect.distanceTo(point);
                var rt_dist = x.rt.rect.distanceTo(point);

                if (lb_dist < this._closest_distance && rt_dist < this._closest_distance) {

                    if (lb_dist <= rt_dist) {
                        this._nearest(x.lb, point);
                        // if (rt_dist < this._closest_distance)
                        this._nearest(x.rt, point);
                    } else {
                        this._nearest(x.rt, point);
                        // if (lb_dist < this._closest_distance)
                        this._nearest(x.lb, point);
                    }

                } else if (lb_dist < this._closest_distance) {
                    this._nearest(x.lb, point);
                } else {
                    this._nearest(x.rt, point);
                }
            }

            else if (x.lb !== undefined) {
                var lb_dist = x.lb.rect.distanceTo(point);
                // if (lb_dist < this._closest_distance)
                this._nearest(x.lb, point);
            } else {
                var rt_dist = x.rt.rect.distanceTo(point);
                //if (rt_dist < this._closest_distance)
                this._nearest(x.rt, point);
            }

        }

    },
    // Find all points contained within a specified rectangle
    range : function(rect){
        var stk = [];
        this.rangeSearch(rect, this.root, stk);
        return stk;
    },
    rangeSearch : function(rect,node,found){
        if (node === undefined) return;

        if (rect.contains(node.point)) {
            found.push(node);
        }

        if (node.lb !== undefined) {
            if (rect.intersects(node.lb.rect)) {
                this.rangeSearch(rect, node.lb, found);
            }
        }

        if (node.rt !== undefined) {
            if (rect.intersects(node.rt.rect)) {
                this.rangeSearch(rect, node.rt, found);
            }
        }

    },

    _closest_distance: Number.POSITIVE_INFINITY,
    _closestNodes : [],
    _closestNode: undefined,

}
