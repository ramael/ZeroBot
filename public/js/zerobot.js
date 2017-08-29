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
    
    this.mouseEvent = {
        mouseDown: false,
        mouseX: 0,
        mouseY: 0
    };
    
    this.touchEvent = {
        touches: [],
        leftTouchID: -1,
        leftTouchPos: new Vector2(0,0),
        leftTouchStartPos: new Vector2(0,0),
        leftVector: new Vector2(0,0)
    };
};
ZeroBotClient.prototype = {
    init: function() {
        var streamImg = '<img src="http://' + window.location.hostname + ':9000/?action=stream" />';
        document.getElementById("streamContainer").innerHTML = streamImg;
        
//        var msg = '<li>Touchable: ' + this.touchable + '</li>';
//        document.getElementById("messages").innerHTML = msg;

        var that = this;
        this.socket.on('sysinfo', function(msg){
            that.sysinfo = msg;
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
            window.onresize = this.resetCanvas.bind(this);  
        } else {
            this.canvas.addEventListener( 'mousemove', this.onMouseMove.bind(this), false );
            this.canvas.addEventListener( 'mousedown', this.onMouseDown.bind(this), false );
            this.canvas.addEventListener( 'mouseup', this.onMouseUp.bind(this), false );
        }
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
		
	this.touchEvent.leftVector.x = this.getInRange(this.touchEvent.leftVector.x, this.minValue, this.maxValue);
	this.touchEvent.leftVector.y = this.getInRange(this.touchEvent.leftVector.y, this.minValue, this.maxValue);
		
	this.tankDrive(this.touchEvent.leftVector.x, -this.touchEvent.leftVector.y);       
	if (this.motor.left > 0) this.motor.left += 90;
	if (this.motor.left < 0) this.motor.left -= 90;
	if (this.motor.right > 0) this.motor.right += 90;
	if (this.motor.right < 0) this.motor.right -= 90;
	this.motor.left = this.getInRange(this.motor.left, this.minValue, this.maxValue);
	this.motor.right = this.getInRange(this.motor.right, this.minValue, this.maxValue);
        
        this.canvasContext.fillStyle = "white"; 
        this.canvasContext.fillText("Stick position: " + this.touchEvent.leftVector.x + "x " + this.touchEvent.leftVector.y + "y", 10, 10); 
	this.canvasContext.fillText("Left Motor: " + this.motor.left + " Right Motor: " + this.motor.right, 10, 20);	
	this.canvasContext.fillText("System info: " + this.sysinfo, 10, 30);	
    },
    drawBase: function() {
        if (!this.mouseEvent.mouseDown) return;
        
        this.canvasContext.beginPath(); 
        this.canvasContext.strokeStyle = "cyan"; 
        this.canvasContext.lineWidth = 6; 
        this.canvasContext.arc(this.touchEvent.leftTouchStartPos.x, this.touchEvent.leftTouchStartPos.y, 40, 0, Math.PI*2, true); 
        this.canvasContext.stroke();
        this.canvasContext.beginPath(); 
        this.canvasContext.strokeStyle = "cyan"; 
        this.canvasContext.lineWidth = 2; 
        this.canvasContext.arc(this.touchEvent.leftTouchStartPos.x, this.touchEvent.leftTouchStartPos.y, 60, 0, Math.PI*2, true); 
        this.canvasContext.stroke();
        this.canvasContext.beginPath(); 
        this.canvasContext.strokeStyle = "cyan"; 
        this.canvasContext.arc(this.touchEvent.leftTouchPos.x, this.touchEvent.leftTouchPos.y, 40, 0, Math.PI*2, true); 
        this.canvasContext.stroke(); 

        this.canvasContext.fillStyle = "white"; 
        this.canvasContext.fillText("mouse: " + this.mouseEvent.mouseX + ", " + this.mouseEvent.mouseY, this.mouseEvent.mouseX, this.mouseEvent.mouseY); 
        this.canvasContext.beginPath(); 
        this.canvasContext.strokeStyle = "red";
        this.canvasContext.lineWidth = "6";
        this.canvasContext.arc(this.mouseEvent.mouseX, this.mouseEvent.mouseY, 40, 0, Math.PI*2, true); 
        this.canvasContext.stroke();
    },
    drawTouchable: function() {
        if (this.touchEvent.touches && this.touchEvent.touches.length > 0) {
            for (var i=0, max = this.touchEvent.touches.length; i < max; i++) {
                var touch = this.touchEvent.touches[i]; 
                //if (touch.identifier === this.touchEvent.leftTouchID){
                    this.canvasContext.beginPath(); 
                    this.canvasContext.strokeStyle = "cyan"; 
                    this.canvasContext.lineWidth = 6; 
                    this.canvasContext.arc(this.touchEvent.leftTouchStartPos.x, this.touchEvent.leftTouchStartPos.y, 40, 0, Math.PI*2, true); 
                    this.canvasContext.stroke();
                    this.canvasContext.beginPath(); 
                    this.canvasContext.strokeStyle = "cyan"; 
                    this.canvasContext.lineWidth = 2; 
                    this.canvasContext.arc(this.touchEvent.leftTouchStartPos.x, this.touchEvent.leftTouchStartPos.y, 60, 0, Math.PI*2, true); 
                    this.canvasContext.stroke();
                    this.canvasContext.beginPath(); 
                    this.canvasContext.strokeStyle = "cyan"; 
                    this.canvasContext.arc(this.touchEvent.leftTouchPos.x, this.touchEvent.leftTouchPos.y, 40, 0, Math.PI*2, true); 
                    this.canvasContext.stroke(); 
                //} else {
                    this.canvasContext.fillStyle = "white";
                    this.canvasContext.fillText("touch id : "+touch.identifier+" x:"+touch.clientX+" y:"+touch.clientY, touch.clientX+30, touch.clientY-30); 
                    this.canvasContext.beginPath(); 
                    this.canvasContext.strokeStyle = "red";
                    this.canvasContext.lineWidth = "6";
                    this.canvasContext.arc(touch.clientX, touch.clientY, 40, 0, Math.PI*2, true); 
                    this.canvasContext.stroke();
                //}
            }
        }
    },    
    sendControls: function(){
	if (this.sendFlag){
            this.socket.emit('pos', this.motor.left, this.motor.right);
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
     *	e.touches: 			Array of touch objects for every finger currently touching the screen
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
        for( var i = 0, max = e.changedTouches.length; i < max; i++){
            var touch = e.changedTouches[i]; 
            if ((this.touchEvent.leftTouchID < 0) && (touch.clientX < this.halfWidth)) {
                this.touchEvent.leftTouchID = touch.identifier; 
                this.touchEvent.leftTouchStartPos.reset(touch.clientX, touch.clientY); 	
                this.touchEvent.leftTouchPos.copyFrom(this.touchEvent.leftTouchStartPos); 
                this.touchEvent.leftVector.reset(0,0); 
                continue; 		
            } else {
                //this.makeBullet(); 
            }	
        }
        this.touchEvent.touches = e.touches; 
    },
    onTouchMove: function(e) {
        // Prevent the browser from doing its default thing (scroll, zoom)
        e.preventDefault();
        for (var i = 0, max = e.changedTouches.length; i < max; i++){
                var touch = e.changedTouches[i]; 
                if (this.touchEvent.leftTouchID === touch.identifier) {
                    this.touchEvent.leftTouchPos.reset(touch.clientX, touch.clientY); 
                    this.touchEvent.leftVector.copyFrom(this.touchEvent.leftTouchPos); 
                    this.touchEvent.leftVector.minusEq(this.touchEvent.leftTouchStartPos);
                    this.sendFlag = true;
                    break; 		
                }		
        }
        this.touchEvent.touches = e.touches; 
    }, 
    onTouchEnd: function(e) { 
        this.touchEvent.touches = e.touches; 
        for (var i = 0, max = e.changedTouches.length; i < max; i++){
            var touch = e.changedTouches[i]; 
            if (this.touchEvent.leftTouchID === touch.identifier) {
                this.touchEvent.leftTouchID = -1; 
                this.touchEvent.leftVector.reset(0,0);
                this.motor.left = 0;
                this.motor.right = 0;
                this.sendFlag = true;
                break; 		
            }		
        }
    },
    onMouseDown: function(e) {
        this.touchEvent.leftTouchStartPos.reset(e.offsetX, e.offsetY); 	
        this.touchEvent.leftTouchPos.copyFrom(this.touchEvent.leftTouchStartPos); 
        this.touchEvent.leftVector.reset(0,0); 
        this.mouseEvent.mouseDown = true;
    },
    onMouseMove: function(e) {
        this.mouseEvent.mouseX = e.offsetX;
        this.mouseEvent.mouseY = e.offsetY;
        if (this.mouseEvent.mouseDown){
            this.touchEvent.leftTouchPos.reset(e.offsetX, e.offsetY); 
            this.touchEvent.leftVector.copyFrom(this.touchEvent.leftTouchPos); 
            this.touchEvent.leftVector.minusEq(this.touchEvent.leftTouchStartPos); 	
            this.sendFlag = true;
        }
    },
    onMouseUp: function(e) { 
        this.touchEvent.leftVector.reset(0,0);
        this.motor.left = 0;
        this.motor.right = 0;
        this.mouseEvent.mouseDown = false;
        this.sendFlag = true;
    },
    
    /*
     * Utilities
     */
    getInRange: function(value, min, max) {
        return Math.min(Math.max(parseInt(value), min), max);
    },
    isMouseOver: function(minX, minY, maxX, maxY){
	return(this.mouseEvent.mouseX > minX && this.mouseEvent.mouseY > minY && this.mouseEvent.mouseX < maxX && this.mouseEvent.mouseY < maxY);
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
        this.socket.emit('debug', msg);
    }
};
var zbClient = new ZeroBotClient();
zbClient.init();
