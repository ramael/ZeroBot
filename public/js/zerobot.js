Vector2 = function(x,y) {
    this.x = x || 0; 
    this.y = y || 0; 	
};
Vector2.prototype = {
    reset: function ( x, y ) {
        this.x = x;
        this.y = y;
        return this;
    },
    copyFrom : function (v) {
        this.x = v.x;
        this.y = v.y;
    },
    plusEq : function (v) {
        this.x+=v.x;
        this.y+=v.y;

        return this; 
    },
    minusEq : function (v) {
        this.x-=v.x;
        this.y-=v.y;

        return this; 
    },
    equals : function (v) {
        return((this.x==v.x)&&(this.y==v.x));
    }
};

ZBUtils = {
    createElement : function(tagName, id, classes, parentObj, events) {
        parentObj = parentObj || document.body;
        var elem = document.createElement(tagName);
        if (id) {
            elem.id = id;
        }
        if (classes) {
            elem.className = classes;
//            var splittedClasses = classes.split(" ");
//            if (splittedClasses && splittedClasses.length > 0) {
//                for (var i = 0, max = splittedClasses.length; i < max; i++) {
//                    elem.classList.add(splittedClasses[i]);
//                }
//            }
        }
        if (events) {
            for (var evt in events) {
                if (events.hasOwnProperty(evt)) {
                    elem.addEventListener(evt, events[evt]);
                }
            }
        }
        parentObj.appendChild(elem);
        return elem;
    }
};

ZeroBotClient = function() {
    this.touchable = ('createTouch' in document ? true : false);
    
    this.socket = io();    
    
    this.canvas = null;
    this.canvasContext = null;
    this.container = null;
    this.halfWidth = 0;
    this.halfHeight = 0;
    this.sendFlag = false;
    this.sysinfo = "";
    
    this.minJoy = -255;
    this.maxJoy = 255;
    this.minValue = -255;
    this.maxValue = 255;

    this.motor = {
        left: 0,
        right: 0
    };
       
    this.zbEvent = {
        mouseDown: false,
        touchID: -1,
        touchPos: new Vector2(0,0),
        touchStartPos: new Vector2(0,0),
        vector: new Vector2(0,0)
    };
};
ZeroBotClient.prototype = {
    init: function() {
        //window.onclick = this.closeDropdowns;
        
        var streamImg = '<img src="http://' + window.location.hostname + ':9000/?action=stream" />';
        document.getElementById("streamContainer").innerHTML = streamImg;
        
        var that = this;
        this.socket.on('sysinfo', function(msg){
            that.sysinfo = JSON.parse(msg);
        });
        
        this.setupCanvas();
        
        setInterval(this.draw.bind(this), 1000/30);                    // draw app at 30fps
        setInterval(this.sendControls.bind(this), 1000/20);            // send control input at 20fps
    },
    setupCanvas: function() {
        this.canvas = document.createElement( 'canvas' );
	this.canvasContext = this.canvas.getContext( '2d' );
	this.container = document.createElement( 'div' );
	this.container.className = "container";
	document.body.appendChild( this.container );
	this.container.appendChild(this.canvas);	
	this.resetCanvas(); 
        
	this.canvasContext.strokeStyle = "#ffffff";
	this.canvasContext.lineWidth =2;	
              
        if (this.touchable) {
            this.canvas.addEventListener( 'touchstart', this.onTouchStart.bind(this), false );
            this.canvas.addEventListener( 'touchmove', this.onTouchMove.bind(this), false );
            this.canvas.addEventListener( 'touchend', this.onTouchEnd.bind(this), false );
            window.onorientationchange = this.resetCanvas.bind(this);              
        } else {
            this.canvas.addEventListener( 'mousemove', this.onMouseMove.bind(this), false );
            this.canvas.addEventListener( 'mousedown', this.onMouseDown.bind(this), false );
            this.canvas.addEventListener( 'mouseup', this.onMouseUp.bind(this), false );
        }
        window.onresize = this.resetCanvas.bind(this);  
    },
    resetCanvas: function(e) {  
 	// resize the canvas - but remember - this clears the canvas too. 
  	this.canvas.width = window.innerWidth; 
	this.canvas.height = window.innerHeight;
	
	this.halfWidth = this.canvas.width;         //this.canvas.width/2;   ???
	this.halfHeight = this.canvas.height/2;
	
	//make sure we scroll to the top left. 
	window.scrollTo(0,0); 
    },
    draw: function() {
  	this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height); 
	if (this.touchable) {
            this.drawTouchable();
	} else {
	    this.drawBase();
	}
		
	this.zbEvent.vector.x = this.getInRange(this.zbEvent.vector.x, this.minValue, this.maxValue);
	this.zbEvent.vector.y = this.getInRange(this.zbEvent.vector.y, this.minValue, this.maxValue);
		
	this.tankDrive(this.zbEvent.vector.x, -this.zbEvent.vector.y);       
	if (this.motor.left > 0) this.motor.left += 90;
	if (this.motor.left < 0) this.motor.left -= 90;
	if (this.motor.right > 0) this.motor.right += 90;
	if (this.motor.right < 0) this.motor.right -= 90;
	this.motor.left = this.getInRange(this.motor.left, this.minValue, this.maxValue);
	this.motor.right = this.getInRange(this.motor.right, this.minValue, this.maxValue);
        
        this.drawStats();
    },
    drawBase: function() {
        if (!this.zbEvent.mouseDown) return;
        
        this.drawLandingSpot();
        this.drawCurrentSpot();
        this.drawCurrentSpotStats();
    },
    drawTouchable: function() {
        if (this.zbEvent.touchID === -1) return;
        
        this.drawLandingSpot();
        this.drawCurrentSpot();
        this.drawCurrentSpotStats();
    },
    drawStats: function() {
        this.canvasContext.fillStyle = "white"; 
        this.canvasContext.fillText("Stick position: " + this.zbEvent.vector.x + "x " + this.zbEvent.vector.y + "y", 10, 10); 
	this.canvasContext.fillText("Left Motor: " + this.motor.left + " Right Motor: " + this.motor.right, 10, 20);	
	this.canvasContext.fillText("System info:", 10, 30);	
        this.canvasContext.fillText("CPUs: " + this.sysinfo.cpus, 30, 40);	
        this.canvasContext.fillText("Total mem: " + this.sysinfo.totalmem, 30, 50);	
        this.canvasContext.fillText("Free mem: " + this.sysinfo.freemem, 30, 60);	
    },
    drawLandingSpot: function() {
        this.canvasContext.beginPath(); 
        this.canvasContext.strokeStyle = "cyan"; 
        this.canvasContext.lineWidth = 6; 
        this.canvasContext.arc(this.zbEvent.touchStartPos.x, this.zbEvent.touchStartPos.y, 40, 0, Math.PI*2, true); 
        this.canvasContext.stroke();
        this.canvasContext.beginPath(); 
        this.canvasContext.strokeStyle = "cyan"; 
        this.canvasContext.lineWidth = 2; 
        this.canvasContext.arc(this.zbEvent.touchStartPos.x, this.zbEvent.touchStartPos.y, 60, 0, Math.PI*2, true); 
        this.canvasContext.stroke();        
    },
    drawCurrentSpot: function() {
        this.canvasContext.beginPath(); 
        this.canvasContext.strokeStyle = "cyan"; 
        this.canvasContext.lineWidth = 6; 
        this.canvasContext.arc(this.zbEvent.touchPos.x, this.zbEvent.touchPos.y, 40, 0, Math.PI*2, true); 
        this.canvasContext.stroke(); 
    },
    drawCurrentSpotStats: function() {
        this.canvasContext.fillStyle = "white"; 
        this.canvasContext.fillText("id: " + this.zbEvent.touchID + ", x: "+ this.zbEvent.touchPos.x + ", y: " + this.zbEvent.touchPos.y, this.zbEvent.touchPos.x + 25, this.zbEvent.touchPos.y - 25); 
    },
    sendControls: function(){
	if (this.sendFlag){
            this.socket.emit('MOVE', this.motor.left, this.motor.right);
            this.sendFlag = false;
	}
    },
    tankDrive: function(x, y){
        //source: http://www.dyadica.co.uk/basic-differential-aka-tank-drive/
	// First hypotenuse
	var z = Math.sqrt(x * x + y * y);
	// angle in radians
	var rad = Math.acos(Math.abs(x) / z);
	if (isNaN(rad)) rad = 0;
	// and in degrees
	var angle = rad * 180 / Math.PI;
	
	// Now angle indicates the measure of turn
        // Along a straight line, with an angle o, the turn co-efficient is same
        // this applies for angles between 0-90, with angle 0 the co-eff is -1
        // with angle 45, the co-efficient is 0 and with angle 90, it is 1
        var tcoeff = -1 + (angle / 90) * 2;
	var turn = tcoeff * Math.abs(Math.abs(y) - Math.abs(x));
	turn = Math.round(turn * 100) / 100;
	// And max of y or x is the movement
	var move = Math.max(Math.abs(y), Math.abs(x));
	        
        // First and third quadrant
        var rawLeft, rawRight;
	if ((x >= 0 && y >= 0) || (x < 0 && y < 0)){
            rawLeft = move;
            rawRight = turn;
	} else {
            rawRight = move;
            rawLeft = turn;
	}
	// Reverse polarity
	if (y < 0) {
            rawLeft = 0 - rawLeft;
            rawRight = 0 - rawRight;
	}
	
	this.motor.left = this.remap(rawLeft, this.minJoy, this.maxJoy, this.minValue, this.maxValue);
	this.motor.right = this.remap(rawRight, this.minJoy, this.maxJoy, this.minValue, this.maxValue);	
    },
    
    /*	
     *	Touch event (e) properties : 
     *	e.touches:              Array of touch objects for every finger currently touching the screen
     *	e.targetTouches: 	Array of touch objects for every finger touching the screen that
     *						originally touched down on the DOM object the transmitted the event.
     *	e.changedTouches	Array of touch objects for touches that are changed for this event. 					
     *						I'm not sure if this would ever be a list of more than one, but would 
     *						be bad to assume. 
     *
     *	Touch objects : 
     *
     *	identifier: An identifying number, unique to each touch event
     *	target: DOM object that broadcast the event
     *	clientX: X coordinate of touch relative to the viewport (excludes scroll offset)
     *	clientY: Y coordinate of touch relative to the viewport (excludes scroll offset)
     *	screenX: Relative to the screen
     *	screenY: Relative to the screen
     *	pageX: Relative to the full page (includes scrolling)
     *	pageY: Relative to the full page (includes scrolling)
     */	
    onTouchStart: function(e) {
        this.closeDropdowns();
        
        for( var i = 0, max = e.changedTouches.length; i < max; i++){
            var touch = e.changedTouches[i]; 
            if ((this.zbEvent.touchID < 0) && (touch.clientX < this.halfWidth)) {
                this.zbEvent.touchID = touch.identifier; 
                this.zbEvent.touchStartPos.reset(touch.clientX, touch.clientY); 	
                this.zbEvent.touchPos.copyFrom(this.zbEvent.touchStartPos); 
                this.zbEvent.vector.reset(0,0); 
                continue; 		
            } else {
                //this.makeBullet(); 
            }	
        }
    },
    onTouchMove: function(e) {
        // Prevent the browser from doing its default thing (scroll, zoom)
        e.preventDefault();
        for (var i = 0, max = e.changedTouches.length; i < max; i++){
                var touch = e.changedTouches[i]; 
                if (this.zbEvent.touchID === touch.identifier) {
                    this.zbEvent.touchPos.reset(touch.clientX, touch.clientY); 
                    this.zbEvent.vector.copyFrom(this.zbEvent.touchPos); 
                    this.zbEvent.vector.minusEq(this.zbEvent.touchStartPos);
                    this.sendFlag = true;
                    break; 		
                }		
        }
    }, 
    onTouchEnd: function(e) { 
        for (var i = 0, max = e.changedTouches.length; i < max; i++){
            var touch = e.changedTouches[i]; 
            if (this.zbEvent.touchID === touch.identifier) {
                this.zbEvent.touchID = -1; 
                this.zbEvent.vector.reset(0,0);
                this.motor.left = 0;
                this.motor.right = 0;
                this.sendFlag = true;
                break; 		
            }		
        }
    },
    onMouseDown: function(e) {
        this.closeDropdowns();
        
        this.zbEvent.touchStartPos.reset(e.offsetX, e.offsetY); 	
        this.zbEvent.touchPos.copyFrom(this.zbEvent.touchStartPos); 
        this.zbEvent.vector.reset(0,0); 
        this.zbEvent.mouseDown = true;
    },
    onMouseMove: function(e) {
        if (this.zbEvent.mouseDown){
            this.zbEvent.touchPos.reset(e.offsetX, e.offsetY); 
            this.zbEvent.vector.copyFrom(this.zbEvent.touchPos); 
            this.zbEvent.vector.minusEq(this.zbEvent.touchStartPos); 	
            this.sendFlag = true;
        }
    },
    onMouseUp: function(e) { 
        this.zbEvent.vector.reset(0,0);
        this.motor.left = 0;
        this.motor.right = 0;
        this.zbEvent.mouseDown = false;
        this.sendFlag = true;
    },
    
    /*
     * Toolbar events
     */
    closeDropdowns: function() {
        var dropdowns = document.querySelectorAll(".dropdown-content");
        if (dropdowns && dropdowns.length > 0) {
            for (var i = 0, max = dropdowns.length; i < max; i++) {
                dropdowns[i].classList.remove("show");                
            }
        }
    },
    onDropdownToggle: function(obj) {
        this.closeDropdowns();
        if (!obj) return;
        var contentNode = obj.parentNode.querySelector(".dropdown-content");
        contentNode.classList.toggle("show");
    },
    onToolItemClick: function(action) {
        this.closeDropdowns();
	this.socket.emit("TOOL", action);
        return false;
    },
    onSystemItemClick: function(action) {
        this.closeDropdowns();
	this.socket.emit("SYSTEM", action);
        return false;
    },
    
    /*
     * Utilities
     */
    getInRange: function(value, min, max) {
        return Math.min(Math.max(parseInt(value), min), max);
    },
    remap: function(value, from1, to1, from2, to2){
	return (value - from1) / (to1 - from1) * (to2 - from2) + from2;
    },
    debug: function(msg) {
        var li = document.createElement( 'li' );
        li.textContent = msg;
        document.getElementById("messages").appendChild( li );  
    },
    debugSrv: function(msg) {
        this.socket.emit('DEBUG', msg);
    }
};
var zbClient = new ZeroBotClient();
zbClient.init();
