/*global $ */

$( document ).ready(function() {

// --------------------
// - General Setup -
// --------------------

  // - Database Setup (Variables come from config File)-
  var cloudant_url = 'http://192.168.1.110'; // Set the general Cloudant URL
  //var cloudant_auth = btoa(user + ':' + pass); // Creates a Base64 String of the User and Pass

  // Canvas
  var c = document.getElementById("nodesCanvas"); // Get Canvas
  var ctx = c.getContext("2d"); // Get Context

  $( "#centermap" ).click(function( event ) {
    map.setView(new L.LatLng(mapViewLat, mapViewLong), mapViewZoom); // Set map to the default values
  });

// ----------------------
// - Main Functions -
// ----------------------

  // -- Get and display all nodes and their status --
  function getServers() {
    docUrl = cloudant_url + '/_membership';
    ajaxGet(docUrl, parse);

    function parse(data) {
      var myData = JSON.parse(data); // Parse data

      var startXPos = 0; // Rect variables Setup
      var xPos = startXPos;
      var yPos = 0;
      var rectHeight = 100;
      var rectWidth= 150;
      var offset = 10;
      var rows = 1;

      var textHeight = 15; // Text variables setup
      var textWidth = 0;
      var text = "";

      c.width = $('#wrapper-main').width()-20; // Calculate Canvas Height & Width
      var nodes = myData.cluster_nodes.length;
      rows = Math.ceil( ( (nodes+0.5)*(rectWidth+offset)) / c.width );

      //var diff =  $(myData.cluster_nodes).not(myData.all_nodes).get(); // The servers which are offline

      c.height = rows*(rectHeight+offset); // Change canvas height
      $("#nodesCanvas").css({"margin-left": "10px"});
      $("#nodesCanvas").css({"margin-top": "10px"});

      var y = 0; // Count active(all)_nodes
      for(var x in myData.cluster_nodes) {
        if(xPos + rectWidth >= 800) { // Check if yPos need to be changed
          yPos = yPos + rectHeight + offset;
          xPos = 0;
          rows ++;
        }

        if(myData.cluster_nodes[x] == myData.all_nodes[y]) { // Detect if server is down or not
          ctx.fillStyle = "#FFF"; // Boxes Style + Pos
        }else{
          ctx.fillStyle = "#CCC"; // Boxes Style + Pos
          y--;
        }
        ctx.fillRect(xPos, yPos, rectWidth, rectHeight);

        ctx.font = textHeight+"px Arial"; // Text Style + Pos
        ctx.fillStyle = "#000000";
        ctx.textAlign = "start";
        text = myData.cluster_nodes[x];
        textWidth = ctx.measureText(text).width;
        ctx.fillText(text, xPos+((rectWidth - textWidth) / 2), textHeight+yPos);

        xPos = xPos+rectWidth+offset; // Change Positions
        y++;
      }
    }
  }

  // -- Find a specific database in _dbs --
  function getDbNumber(db) {
    if(db == "-nodes-") {
      clearShards();
    }else{
      docUrl = cloudant_url + '/_dbs/_all_docs?include_docs=true';
      ajaxGet(docUrl, parse);

      function parse(data) {
        var myData = JSON.parse(data);
        console.log(myData);

        var o = 0;
        while(myData.rows[o].doc._id != db) {
          o++;
        }

        getShards(myData.rows[o].doc);
      }
    }
  }

  // -- Display shards for a specific database --
  function getShards(data) {

    var startXPos = 5; // Rect variables Setup
    var xPos = startXPos;
    var startYPos = 25;
    var yPos = startYPos;
    var rectHeight = 15;
    var rectWidth= 140;
    var offset = 2;
    var rows = 1;

    var textHeight = 12; // Text variables setup
    var textWidth = 0;
    var text = "";

    // Display shards
    for(var nodes in data.by_node) {
      for(var shards in data.by_node[nodes]) {
        ctx.fillStyle = "#009933"; // Boxes Style + Pos
        ctx.fillRect(xPos, yPos, rectWidth, rectHeight);

        ctx.font = textHeight+"px Arial"; // Text Style + Pos
        ctx.fillStyle = "#000000";
        ctx.textAlign = "start";
        text = data.by_node[nodes][shards];
        textWidth = ctx.measureText(text).width;
        ctx.fillText(text, xPos+((rectWidth - textWidth) / 2), textHeight+yPos);

        yPos += rectHeight + offset;
      }

      xPos += 160; // Replact 160 with RectWidth!
      yPos = startYPos;
      if( (xPos+rectWidth) > c.width) {
        xPos = startXPos;
        yPos = startYPos+110;
      }
    }

    // Display number of shards (Q) and replication(N)
    var numShards = Object.keys(data.by_range).length;
    var numRep = data.by_range[Object.keys(data.by_range)[0]].length;
    $('#additional_info').html("#Shards: "+numShards+"<br />Replication-Factor: "+numRep)
  }

  // -- Remove the shards --
  function clearShards() {
    ctx.clearRect(0, 0, c.width, c.height); // Clean the complete canvas
    getServers(); // Show the Nodes and their status again
  }

  // -- Get all available databases --
  function getDatabases() {
    var docUrl = cloudant_url + '/_all_dbs';
    ajaxGet(docUrl, parse);

    function parse(data) {
      var myData = JSON.parse(data);

      for(var dbs in myData) {
        $('#dbs-dropdown').append($('<option></option>').val(myData[dbs]).html(myData[dbs]));
      }
    }
  }

// -----------------------
// - Helper Functions -
// -----------------------

  // -- Ajax Get Function --
  function ajaxGet(docUrl, func) {
    $.ajax({ // Start AJAX Call
      url: docUrl,
      //xhrFields: { withCredentials: true },
      type: "GET",
      //headers: {'Authorization': 'Basic ' + cloudant_auth, 'Content-Type': 'application/json'},
      error: errorHandler,
      complete: completeHandler
    }).done(func);
  }

  // -- Handle AJAX errors --
  function errorHandler(jqXHR, textStatus, errorThrown) {
    //console.log(jqXHR);
  }

  // -- Handle AJAX Completion --
  function completeHandler(jqXHR, textStatus, errorThrown) {
    //console.log(jqXHR);
  }

// -----------------------------
// - Interaction Functions -
// -----------------------------

  // -- Database DropDown changed --
  $('#dbs-dropdown').change(function() {
    getDbNumber( $('#dbs-dropdown').val() ); // Find the correct db in the shards info (_dbs)
  });

// -------------------
// - Run on Start -
// -------------------

  getServers(); // Show the Nodes and their status
  getDatabases(); // Show all available databases in the Dropdown
  $('#wrapper-status').hide(); // Hide the status box


  // $( "#reload_pickups" ).click(function( event ) {
  // });
});
