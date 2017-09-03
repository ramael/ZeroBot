var os = require('os');
var path = require('path');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var exec = require('child_process').exec;
var port = process.env.PORT || 3000;

var gpio = require('pigpio').Gpio;
var motor = {
	left : {
		a : new gpio(17, {mode: gpio.OUTPUT}),
		b : new gpio(18, {mode: gpio.OUTPUT})
	},
	right : {
		a : new gpio(22, {mode: gpio.OUTPUT}),
		b : new gpio(23, {mode: gpio.OUTPUT})
	}
};
const minValue = -255;
const maxValue = 255;

var appPath = path.join(__dirname, 'public');
var appOptions = {
    index: 'index.html'
};

app.use(express.static(appPath, appOptions));
//app.use('/', express.static(appPath, appOptions));

//Whenever someone connects this gets executed
io.on('connection', function(socket){
    console.log('A user connected');

    socket.on('MOVE', moveBot);
    socket.on('DEBUG', debugBot);
    socket.on("TOOL", doToolAction);
    socket.on("SYSTEM", doSystemAction);
    
    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
        console.log('A user disconnected');
    });

    setInterval(getSystemInfo, 5000); // send system info every 5 sec

});

http.listen(port, function(){
    console.log('listening on *:' + port);
});

function debugBot(msg) {
    console.log('Debug: ' + msg);
}
function moveBot(msx, msy) {
//    console.log("moveBot: START");

    msx = getInRange(msx, minValue, maxValue);
    msy = getInRange(msy, minValue, maxValue);

//    console.log('Normalized X:' + msx + ' Normalized Y: ' + msy);

        if (msx > 0){
//		console.log("moveBot: 1");
            motor.left.a.pwmWrite(msx);
            motor.left.b.pwmWrite(0);
        } else {
//		console.log("moveBot: 2");
            motor.left.a.pwmWrite(0);
            motor.left.b.pwmWrite(Math.abs(msx));
        }
//	console.log("moveBot: 3");

        if (msy > 0){
//		console.log("moveBot: 3");
            motor.right.a.pwmWrite(msy);
            motor.right.b.pwmWrite(0);
        } else {
//		console.log("moveBot: 4");
            motor.right.a.pwmWrite(0);
            motor.right.b.pwmWrite(Math.abs(msy));
        }
//	console.log("moveBot: END");

}
function doToolAction(action) {
	console.log("doToolAction: " + action);
}
function doSystemAction(action) {
	console.log("doSystemAction: " + action);
	switch (action) {
		case "REBOOT":
			performSystemAction("sudo reboot");
			break;
		case "SHUTDOWN":
			performSystemAction("sudo shutdown now");
			break;
		default:
			console.log("doSystemAction: unknown " + action);
			break;
	}
}
function performSystemAction(cmd) {
	exec(cmd, function(error, stdout, stderr) {
		if (error) {
			console.log("PerformSystemAction error: " + error);
		}else{
			console.log("PerformSystemAction: " + stdout);
		}
	});
}
function getInRange(value, min, max) {
    return Math.min(Math.max(parseInt(value), min), max);
}
function getSystemInfo() {
//    exec("cat /sys/class/thermal/thermal_zone0/temp", function(error, stdout, stderr){
//            if(error !== null){
//                console.log('exec error: ' + error);
//            } else {
//                var temp = parseFloat(stdout)/1000;
//                io.emit('temp', temp);
//                console.log('temp', temp);
//            }
//        });
    var cpus = JSON.stringify(os.cpus());
    var totalmem = os.totalmem();
    var freemen = os.freemem();
    var info = {
        cpus: cpus,
        totalmem: totalmem,
        freemem: freemen
    };
    io.emit("sysinfo", JSON.stringify(info));
//    console.log("sysinfo", info);
}
