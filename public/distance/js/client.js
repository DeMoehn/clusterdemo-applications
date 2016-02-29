window.onload = function () {
  console.log("Window loaded");

  var tempData = Array();
  var humData = Array();
  var globalTemp = 0;
  var globalHum = 0;
  var updateCount = 0;
  var dataLength = 120;

	var chart = new CanvasJS.Chart("chartContainer", {
			title : {
				text : "Current Temperature / Humidity",
        fontColor: "#002C77",
        fontFamily: "HelveticaNeue-Light",
        padding: 5
			},
      culture: "de",
      backgroundColor: null,
      animationEnabled: true,
      toolTip: {
        shared: true,
        content: function(e){
          var body ;
          var head ;
          head = "<span style = 'color:DodgerBlue; '><strong>"+ (e.entries[0].dataPoint.x)  + " sec</strong></span><br/>";

          body = "<span style= 'color:"+e.entries[0].dataSeries.color + "'> " + e.entries[0].dataSeries.name + "</span>: <strong>"+  e.entries[0].dataPoint.y + "</strong>  Celsius<br/> <span style= 'color:"+e.entries[1].dataSeries.color + "'> " + e.entries[1].dataSeries.name + "</span>: <strong>"+  e.entries[1].dataPoint.y + "</strong>  %";

          return (head.concat(body));
        }
      },
      axisX: {
        title: "Time",
        titleFontSize: 18,
        titleFontFamily:  "HelveticaNeue-Light",
        interlacedColor: "#F0F8FF",
        margin: 5,
        suffix : " s"
      },

      axisY:{
        title: "Temperature",
        titleFontSize: 18,
        titleFontFamily:  "HelveticaNeue-Light",
        lineColor: "#C90000",
        lineThickness: 3,
        margin: 5,
        suffix : " °C",
        viewportMinimum: 10,
        viewportMaximum: 40
      },
      axisY2:{
        title: "Humidity",
        titleFontSize: 18,
        titleFontFamily:  "HelveticaNeue-Light",
        lineColor: "#71CEF5",
        lineThickness: 3,
        margin: 5,
        suffix : " %",
        viewportMinimum: 10,
        viewportMaximum: 70
      },
			data : [{
          name: "Temperature",
          color: "#C90000",
          lineThickness: 2,
					type : "line",
          markerType: "triangle",
          markerColor: "#C90000",
					dataPoints : tempData
				},
        {
        name: "Humidity",
        color: "#71CEF5",
        lineThickness: 2,
        type : "line",
        markerType: "circle",
        markerColor: "#71CEF5",
        axisYType: "secondary",
        dataPoints : humData
      }
			]
		});

	chart.render();

	var updateChart = function () {
    updateCount++;
    tempData.push({x: updateCount, y: Number(globalTemp)});
    humData.push({x: updateCount, y: Number(globalHum)});

    if (tempData.length > dataLength){
				tempData.shift();
        humData.shift();
			}
		chart.render();
	};

	// update chart every second
	setInterval(function() {updateChart()}, 1000);

  var socket = io(); // Initialize Socket.io

  // -- Listen for distance report (every 0.05 sec) --
  socket.on('distance', function(msg){
    checkDistance(msg);
  });

  function checkDistance(cm) {
    // Normalize values
    if(cm > 200) {
      $('#distance-result').html("Distance: 200+ cm");
      cm = 200;
    }else{
      $('#distance-result').html("Distance: "+cm+" cm");
    }

    // Create messages to display
    if(cm < 20) {
      $('#greeting').html("Hey!!");
      $('#message').html("Don't come too close!");
    }else if(cm > 20 && cm <= 80) {
      $('#greeting').html("Perfect");
      $('#message').html("Talk to us if you're interested in what we're doing.");
    }else if(cm > 80 && cm <= 120) {
      $('#greeting').html("Almost perfect.");
      $('#message').html("Come just a bit closer if you like.");
    }else if(cm > 120 && cm <= 180) {
      $('#greeting').html("Hey you!");
      $('#message').html("Please come a little closer...");
    }else if(cm > 150) {
      $('#greeting').html("Hello");
      $('#message').html("Please come and talk to us...");
    }
  }

  // -- Listen for temp/hum/dist report (every 1 sec) --
  socket.on('report', function(msg){
    checkTemp(msg, chart);
  });

  function checkTemp(msg, chart) {
    globalTemp = msg[0];
    globalHum = msg[1];
    $('#temp-result').html('<div>Temperature: ' + msg[0] + ' °C</div>'); // Change HTML in frontend
    $('#hum-result').html('<div>Humidity: ' + msg[1]+ ' %</div>'); // Change HTML in frontend
  }

  // -- Check for avg Distance reports (every 5 sec)--
  socket.on('avg avgDist', function(msg){
    changeDistAvg(msg);
  });

  function changeDistAvg(msg) {
    $('#distance-avg').html("(Average: "+msg[0]+" cm, Min: "+msg[2]+" cm, Max: "+msg[3]+" cm)");
    $('#dataptitle').html(msg[1]);
  }

  // -- Check for avg Temp/Hum reports (every 5 sec)--
  socket.on('avg avgTemp', function(msg){
    changeTempAvg(msg);
  });

  function changeTempAvg(msg) {
    $('#temp-avg-temp').html('(Average: '+msg[0]+' °C, Min: '+msg[2]+' °C, Max: '+msg[3]+' °C)');
  }

  socket.on('avg avgHum', function(msg){
    changeHumAvg(msg);
  });

  function changeHumAvg(msg) {
    $('#hum-avg-hum').html('(Average: '+msg[0]+' %, Min: '+msg[2]+' %, Max: '+msg[3]+' %)');
  }
};
