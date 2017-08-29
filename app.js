var os = require('os');
var path = require('path');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var exec = require('child_process').exec;
var port = process.env.PORT || 3000;

//var gpio = require('pigpio').Gpio;
//var A1 = new gpio(27, {mode: gpio.OUTPUT});
//var A2 = new gpio(17, {mode: gpio.OUTPUT});
//var B1 = new gpio( 4, {mode: gpio.OUTPUT});
//var B2 = new gpio(18, {mode: gpio.OUTPUT});

const minValue = -255;
const maxValue = 255;

app.use(express.static('public'));
app.get('/', function(req, res){
    res.sendFile(path.join(__dirname, 'public/index.html'));
    console.log('HTML sent to client');
});

//Whenever someone connects this gets executed
io.on('connection', function(socket){
    console.log('A user connected');

    socket.on('pos', moveBot);
    socket.on('debug', debugBot);
    
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
//    console.log('Received X:' + msx + ' Received Y: ' + msy);

    msx = getInRange(msx, minValue, maxValue);
    msy = getInRange(msy, minValue, maxValue);

//    console.log('Normalized X:' + msx + ' Normalized Y: ' + msy);
    
//        if (msx > 0){
//            A1.pwmWrite(msx);
//            A2.pwmWrite(0);
//        } else {
//            A1.pwmWrite(0);
//            A2.pwmWrite(Math.abs(msx));
//        }

//        if (msy > 0){
//            B1.pwmWrite(msy);
//            B2.pwmWrite(0);
//        } else {
//            B1.pwmWrite(0);
//            B2.pwmWrite(Math.abs(msy));
//        }

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
    var cpus = os.cpus();
    var totalmem = os.totalmem();
    var freemen = os.freemem();
    var info = "CPUs: " + cpus + " Total mem: " + totalmem + " Free mem: " + freemen;
    io.emit("sysinfo", info);
//    console.log("sysinfo", info);
}
