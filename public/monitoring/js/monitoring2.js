/*global $ */

$( document ).ready(function() {

// --------------------
// - General Setup -
// --------------------

  // -- Database Setup (Variables come from config File) --
  var cloudant_url = 'http://192.168.1.110'; // Set the general Cloudant URL
  //var cloudant_auth = btoa(user + ':' + pass); // Creates a Base64 String of the User and Pass

  // -- Canvas Setup --
  var c = document.getElementById("nodesCanvas"); // Get Canvas
  var ctx = c.getContext("2d"); // Get Context
  var cState; // CanvasState Variable

  // -- Variables setup --
  var nodeArr = []; // Save Canvas-Nodes
  var nodesUp = []; // Save nodes which are up
  var nodesDown = []; // Save nodes which are down
  var currentDB = '-nodes-'; // Current selected DB

// ----------------------
// - Main Functions -
// ----------------------

  // -- Get and display all nodes and their status --
  function getServers(db) {
    var nodeRect = {'startX': 0, 'x': 0, 'startY': 0, 'y': 0, 'h': 150, 'w': 150, 'offset': 10, 'color': '#FFF'};
    var nodeTitle = {'startX': 0, 'x': 0, 'startY': 0, 'y': 0, 'h': 15, 'w': 0, 'offset': 10, 'color': '#000', 'text': 'none'};
    var rows = 1;
    nodeArr = []; // Reset Servers Array
    nodesUp = []; // Save nodes which are up
    nodesDown = []; // Save nodes which are down

    docUrl = cloudant_url + '/_membership'; // CouchDB URL for servers
    ajaxGet(docUrl, parse); // Make Request

    function parse(data) { // Parse request
      var myData = JSON.parse(data); // Parse data

      var nodes = myData.cluster_nodes.length;
      rows = Math.ceil( ( (nodes+0.5)*(nodeRect.w + nodeRect.offset)) / c.width );

      c.width = $('#wrapper-main').width()-20; // Calculate Canvas width based on total width
      c.height = rows*(nodeRect.h+nodeRect.offset); // Change canvas height based on number of rows
      cState = new CanvasState(document.getElementById('nodesCanvas')); // Create new CanvasState

      var y = 0; // Count active(all)_nodes
      for(var x in myData.cluster_nodes) {
        if(nodeRect.x + nodeRect.w >= 800) { // Check if yPos need to be changed
          nodeRect.y += nodeRect.h + nodeRect.offset;
          nodeRect.x = nodeRect.startX; // Reset xPos
          rows ++;
        }

        if(myData.cluster_nodes[x] == myData.all_nodes[y]) { // Detect if server is down or not
          nodeRect.color = "#FFF"; // Boxes Style + Pos
          nodesUp.push(myData.cluster_nodes[x]);
        }else{
          nodeRect.color = "#CCC"; // Boxes Style + Pos
          nodesDown.push(myData.cluster_nodes[x]);
          y--;

        }

        nodeTitle.x = nodeRect.x;
        nodeTitle.y = nodeRect.y;
        nodeTitle.text = myData.cluster_nodes[x];

        var currentNode = new Node(x); // Create a new Node Object
        currentNode.addNode({'shape': nodeRect, 'title': nodeTitle}); // Add Rectangle
        var btnStop = new cButton({'x': nodeRect.x+10, 'y': nodeRect.y+nodeRect.h-30, 'color': '#CCC', 'size': 14, 'text': 'Shutdown', 'id': x});
        btnStop.addListener("foo", function(data) {
          docUrl = "http://"+nodeArr[data.target.getID()].nodeTitle.text+":4730/stop";
          ajaxGet(docUrl, parseIt);
          function parseIt(data) {
            console.log(data);
          }
        });
        currentNode.addButton(btnStop); // Button: x, y, bg-color, textSize, text

        var btnStart = new cButton({'x': currentNode.buttons[0].x+ctx.measureText(currentNode.buttons[0].text).width+40, 'y': nodeRect.y+nodeRect.h-30, 'color': '#CCC', 'size': 14, 'text': 'Start', 'id': x})
        btnStart.addListener("foo", function(data) {
          docUrl = "http://"+nodeArr[data.target.getID()].nodeTitle.text+":4730/start";
          ajaxGet(docUrl, parseIt);
          function parseIt(data) {
            console.log(data);
          }
        });
        currentNode.addButton(btnStart); // Button: x, y, bg-color, textSize, text

        nodeArr.push(currentNode); // Save the Node Object

        // Change Positions
        nodeRect.x += nodeRect.w + nodeRect.offset;
        y++;
      }

      if( (db == '-nodes-') ) {
        for(var count in nodeArr) {
          nodeArr[count].draw(cState); // Draw everything
        }
      }else{
        getDbNumber(db); // Now find the Db and the shards
      }
    }
  }

  // -- Find a specific database in _dbs --
  function getDbNumber(db) {
    docUrl = cloudant_url + '/_dbs/_all_docs?include_docs=true';
    ajaxGet(docUrl, parse);

    function parse(data) {
      var myData = JSON.parse(data);
      var o = 0;
      while(myData.rows[o].doc._id != db) {
        o++;
      }
      getShards(myData.rows[o].doc);
    }
  }

  // -- Display shards for a specific database --
  function getShards(data) {
    // Display shards
    var count = 0; // Count to follow up with nodeArr
    for(var nodes in data.by_node) {
      var nodeObject = nodeArr[count].nodeShape;
      var shardRect = {'x': nodeObject.x+5, 'startY': 25, 'y': nodeObject.y + 25, 'h': 15, 'w': nodeObject.w - 10, 'offset': 2, 'color': '#009933'};
      var shardTitle = {'x': 0, 'y': 0, 'h': 12, 'w': 0, 'offset': 10, 'color': '#000', 'text': 'none'};

      for(var shards in data.by_node[nodes]) {
        shardTitle.text = data.by_node[nodes][shards];
        shardTitle.x = shardRect.x;
        shardTitle.y = shardRect.y;
        nodeArr[count].addShard( {'rect': shardRect, 'title': shardTitle} );

        shardRect.y += shardRect.h + shardRect.offset;
      }
      nodeArr[count].draw(cState); // Draw everything
      count++;
    }

    // Display number of shards (Q) and replication(N)
    var numShards = Object.keys(data.by_range).length;
    var numRep = data.by_range[Object.keys(data.by_range)[0]].length;
    $('#additional_info').html("#Shards: "+numShards+"<br />Replication-Factor: "+numRep)
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

  function detectNodeChanges() {
    docUrl = cloudant_url + '/_membership'; // CouchDB URL for servers
    ajaxGet(docUrl, parse); // Make Request

    function parse(data) { // Parse request
      var myData = JSON.parse(data); // Parse data

      var y = 0; // Count active(all)_nodes
      for(var x in myData.cluster_nodes) {
        if(myData.cluster_nodes[x] != myData.all_nodes[y]) { // Detect if server is down or not
          if( nodesDown.indexOf(myData.cluster_nodes[x]) > -1) {
            console.log(myData.cluster_nodes[x]+" is bekannt!");
          }else{
            console.log(myData.cluster_nodes[x]+" war unbekannt");
            getServers(currentDB);
          }
          y--;
        }else{
          if( nodesUp.indexOf(myData.cluster_nodes[x]) > -1) {
            console.log(myData.cluster_nodes[x]+" is bekannt on!");
          }else{
            console.log(myData.cluster_nodes[x]+" war unbekannt on");
            getServers(currentDB);
          }
        }
        y++;
      }
    }
  }

// -----------------------------
// - Interaction Functions -
// -----------------------------

  // -- Database DropDown changed --
  $('#dbs-dropdown').change(function() {
    currentDB = $('#dbs-dropdown').val();
    getServers(currentDB); // Find the correct db in the shards info (_dbs)
  });

// -------------------
// - Run on Start -
// -------------------

  getServers(currentDB); // Show the Nodes and their status
  getDatabases(); // Show all available databases in the Dropdown
  var checkNodeChanges = window.setInterval(detectNodeChanges, 2000);

  $('#wrapper-status').hide(); // Hide the status box
});
