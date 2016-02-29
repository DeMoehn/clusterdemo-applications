/*global $ */

$( document ).ready(function() {

// --------------------
// - General Setup -
// --------------------

  // -- Database Setup (Variables come from config File) --
  var cloudant_url = 'http://192.168.1.110'; // Set the general Cloudant URL

  // -- Canvas Setup --
  var c = $('#nodesCanvas'); // Get Canvas

  // -- Variables setup --
  var currentDB = '-nodes-'; // Current selected DB
  var nodeArr = Array();

// ----------------------
// - Main Functions -
// ----------------------

  function resetVars () {
    nodeArr = [];
  }

  // -- Get and display all nodes and their status --
  function getServers(db) {
    resetVars();

    docUrl = cloudant_url + '/_membership'; // CouchDB URL for servers
    ajaxGet(docUrl, parse); // Make Request

    function parse(data) { // Parse request
      var myData = JSON.parse(data); // Parse data
      var nodes = myData.cluster_nodes.length;

      for(var x in myData.cluster_nodes) {
        var currentNode = new Node(x); // Create a new Node Object
        var nodeColor = "";
        var nodeTitle = "";

        // if(myData.cluster_nodes[x] == myData.all_nodes[y]) { // Detect if server is down or not
        //   nodeColor = "#FFF"; // Boxes Style + Pos
        // }else{
        //   nodeColor  = "#CCC"; // Boxes Style + Pos
        //   y--;
        // }

        nodeTitle = myData.cluster_nodes[x];
        currentNode.addNode({'color': "#CCC", 'title': nodeTitle}); // Add Rectangle

        var btnStop = new cButton({'color': '#CCC', 'text': 'Shutdown', 'id': x});
        btnStop.addListener("foo", function(data) {
          docUrl = "http://"+nodeArr[data.target.getID()].nodeTitle.text+":4730/stop";
          ajaxGet(docUrl, parseIt);
          function parseIt(data) {
            console.log(data);
          }
        });
        currentNode.addButton(btnStop); // Button: x, y, bg-color, textSize, text

        var btnStart = new cButton({'color': '#CCC', 'text': 'Start', 'id': x})
        btnStart.addListener("foo", function(data) {
          docUrl = "http://"+nodeArr[data.target.getID()].nodeTitle.text+":4730/start";
          ajaxGet(docUrl, parseIt);
          function parseIt(data) {
            console.log(data);
          }
        });
        currentNode.addButton(btnStart); // Button: x, y, bg-color, textSize, text

        nodeArr.push(currentNode); // Save the Node Object
        y++;
      }

      if( (db == '-nodes-') ) {
        c.html('Currently no nodes found');
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
      while(myData.nodeRows[o].doc._id != db) {
        o++;
      }
      getShards(myData.nodeRows[o].doc);
    }
  }

  // -- Display shards for a specific database --
  function getShards(data) {
    // Display shards
    var count = 0; // Count to follow up with nodeArr
    for(var nodes in data.by_node) {
      var nodeObject = nodeArr[count].nodeShape;
      var shardTitle = {'text': 'none'};

      for(var shards in data.by_node[nodes]) { // Run trough all shards and add them to the node
        shardTitle.text = data.by_node[nodes][shards];
        nodeArr[count].addShard( {'title': shardTitle} );
      }
      nodeArr[count].draw(cState); // Draw the complete node
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
    // docUrl = cloudant_url + '/_membership'; // CouchDB URL for servers
    // ajaxGet(docUrl, parse); // Make Request
    //
    // function parse(data) { // Parse request
    // //   var myData = JSON.parse(data); // Parse data
    // //
    // //   var y = 0; // Count active(all)_nodes
    // //   for(var x in myData.cluster_nodes) {
    // //     if(myData.cluster_nodes[x] != myData.all_nodes[y]) { // Detect if server is down or not
    // //       if( nodesDown.indexOf(myData.cluster_nodes[x]) > -1) {
    // //         console.log(myData.cluster_nodes[x]+" is bekannt!");
    // //       }else{
    // //         console.log(myData.cluster_nodes[x]+" war unbekannt");
    // //         getServers(currentDB);
    // //       }
    // //       y--;
    // //     }else{
    // //       if( nodesUp.indexOf(myData.cluster_nodes[x]) > -1) {
    // //         console.log(myData.cluster_nodes[x]+" is bekannt on!");
    // //       }else{
    // //         console.log(myData.cluster_nodes[x]+" war unbekannt on");
    // //         getServers(currentDB);
    // //       }
    // //     }
    // //     y++;
    // //   }
    // }
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
