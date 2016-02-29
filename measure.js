#!/usr/bin/env node

var statistics = require('math-statistics'); // Lib for Math functions
var usonic     = require('r-pi-usonic'); // Lib for Sensor
var express = require('express'); // Frontend Framework
var sensorLib = require('node-dht-sensor'); // Framework for temp/hum sensor
var cradle = require('cradle'); // CouchDB client
var dbConnection = new(cradle.Connection)('http://192.168.1.110', 80, {
      retries: 3,
      retryTimeout: 30 * 1000
  });

var cDB =  dbConnection.database('sensor');

// -- Create App and chose directory --
var app = express();
//app.use(express.static('public'));
app.use(express.static('/home/pi/applications/public')); // Use on Pi

// -- Check for different URLs --
app.get('/', function(req, res){
  res.sendFile( __dirname + '/public/index.html');
});

app.get('/dist', function(req, res){
  res.sendFile( __dirname + '/public/distance/measurement.html');
});

app.get('/todo', function(req, res){
  res.sendFile( __dirname + '/public/offline-todo/index.html');
});

app.get('/monitor', function(req, res){
  res.sendFile( __dirname + '/public/monitoring/index.html');
});

app.get('/traffic', function(req, res){
  res.sendFile( __dirname + '/public/traffic/index.html');
});

server = app.listen(3000);
console.log("Listening on 192.168.1.110:3000");
var io = require('socket.io').listen(server); // Socket.io (transportation)

// -- Measure distance --
var myDistance = 0.0;
var oldDistance = 0.0;
var globalDistance = 0.0;

var print = function (distances) {
    var distance = statistics.median(distances); // Calculate distance from mediam of several distances

    //process.stdout.clearLine();
    //process.stdout.cursorTo(0);

    if (distance < 0) {
        //process.stdout.write('Error: Measurement timeout.\n');
        myDistance = 'Error: Measurement timeout.\n';
    } else {
        if((oldDistance > 1000) && (distance < 10)) {
          distance = 2000.0;
        }
        //process.stdout.write('Distance: ' + distance.toFixed(2) + ' cm');
        myDistance = distance.toFixed(2);
        globalDistance = myDistance;
        oldDistance = myDistance;

        io.emit('distance', myDistance);
    }
};

var initSensor = function (config) {
    var sensor = usonic.createSensor(config.echoPin, config.triggerPin, config.timeout);
    var distances;

    (function measure() {
        if (!distances || distances.length === config.rate) {
            if (distances) {
                print(distances);
            }

            distances = [];
        }

        setTimeout(function () {
            distances.push(sensor());

            measure();
        }, config.delay);
    }());
};

// Start
usonic.init(function (error) {
  if (error) {
      console.log('Error: '+error);
  }else{
    initSensor({
      echoPin: 24,
      triggerPin: 23,
      timeout: 2000,
      delay: 60,
      rate: 5
    });
  }
});

var tempSensor = {
    initialize: function () {
        return sensorLib.initialize(11, 18);
    },
    read: function () {
        var readout = sensorLib.read();
        var temp = readout.temperature.toFixed(2);
        var hum = readout.humidity.toFixed(2);

        io.emit('report', [temp, hum]);
        saveResultsToDB(temp, hum, globalDistance);

        setTimeout(function () {
            tempSensor.read();
        }, 1000);
    }
};

if (tempSensor.initialize()) {
    tempSensor.read();
} else {
    console.warn('Failed to initialize temperature sensor');
}

function saveResultsToDB(temp, hum, globalDistance) {
  if(typeof temp !=='undefined' && typeof hum !=='undefined' && typeof globalDistance !=='undefined' && parseFloat(temp) !== 0 && parseFloat(hum) !== 0 && parseFloat(globalDistance) !== 0) {
    var myTime = new Date().getTime();
    var distanceDoc = { type: "sensor",
                                temperature: parseFloat(temp),
                                humidity: parseFloat(hum),
                                distance: parseFloat(globalDistance),
                                time: myTime};

    cDB.save(distanceDoc, function (err, res) {
        if (err) {
            //console.log(err);
        } else {
            //console.log(res);
        }
    });
  }
}

setInterval(getAvg, 5000, "avgDist"); // Interval to check Avg of distance each second
setInterval(getAvg, 5000, "avgTemp"); // Interval to check Avg of temp&hum
setInterval(getAvg, 5000, "avgHum"); // Interval to check Avg of temp&hum

function getAvg(obj) {
  var avgInfo = Array();
  cDB.view('info/'+obj, function (err, res) {
    if(!err) {
      avgInfo[0] = (res[0].value.sum/res[0].value.count).toFixed(2);
      avgInfo[1] = res[0].value.count;
      avgInfo[2] = res[0].value.min;
      avgInfo[3] = res[0].value.max;
      io.emit('avg '+obj, avgInfo);
    }else{
      console.log(err);
    }
  });
}
