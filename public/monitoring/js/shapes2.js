// ----------------------------
// - "Classes" for Canvas -
// ----------------------------

  // -- Nodes Class --
  function Node(id) {
    this.id = id || 0;
    this.nodeShape = {};
    this.nodeTitle = {};
    this.shards = []; // Contains object {'rect': shardRect, 'title': shardTitle}
    this.buttons = []; // Contains objects
  }

  Node.prototype.constructor = Node;

  Node.prototype.addNode = function(node) { // Creates a new Node
    this.nodeShape = $.extend(true, {}, node.color); // $.extend(true,{},obj) used to copy object, not reference!
    this.nodeTitle= $.extend(true, {}, node.title);
  };

  Node.prototype.addShard = function(shard) { // Assigns Shards to the node
    this.shards.push( $.extend(true, {}, shard) );
  };

  Node.prototype.addButton = function(btn) { // Assigns Buttons to the node
    this.buttons.push( btn );
  };

  Node.prototype.draw = function(cState) {
    cState.addShape( new Shape(this.nodeShape) );
    cState.addShape( new Textbox(this.nodeTitle, this.nodeShape.w) );

    // for(var shard in this.shards) {
    //   cState.addShape( new Shape(this.shards[shard].rect) );
    //   cState.addShape( new Textbox(this.shards[shard].title, this.shards[shard].rect.w) );
    // }
    //
    // for(var btn in this.buttons) {
    //   cState.addClickable(this.buttons[btn]);
    // }
  };

  // -- Shape Class --
  // --- Constructor for Shape objects to hold data for all drawn objects. ---
  function Shape(shapeObj) {
    this.div = document.createElement("div");
    this.div.style.color = shapeObj.color || '#000';
    this.div.innerHTML = "";
  }

  // --- Draws this shape to a given context ---
  Shape.prototype.draw = function(ctx) {
    ctx.appendChild(this); // Draw Shape
  };

  // -- Textbox Class --
  // --- Constructor for Textbox objects to hold data for all drawn objects. ---
  function Textbox(textObj) {
    this.div = document.createElement("div");
    this.div.style.color = textObj.color || '#000';
    this.div.innerHTML =  textObj.text || "None";
  }

  // --- Draws this shape to a given context ---
  Textbox.prototype.draw = function(ctx) {
    ctx.appendChild(this); // Draw Shape
  };

  // -- Button Class --
  // --- Constructor for Shape objects to hold data for all drawn objects. ---
  function cButton(btn) { // Object: {'color': ..., 'text': ..., 'id': ...}
    this.id = btn.id || undefined;
    this.fill = btn.color || '#000';
    this.text = btn.text || "None"; // Text setup

    this._listeners = {}; // Used to store events
  }

  // --- Prototype used to implement EventListeners ---
  cButton.prototype = {
      constructor: cButton,
      addListener: function(type, listener){
          if (typeof this._listeners[type] == "undefined"){
              this._listeners[type] = [];
          }

          this._listeners[type].push(listener);
      },
      fire: function(event){
          if (typeof event == "string"){
              event = { type: event };
          }
          if (!event.target){
              event.target = this;
          }

          if (!event.type){  //falsy
              throw new Error("Event object missing 'type' property.");
          }

          if (this._listeners[event.type] instanceof Array){
              var listeners = this._listeners[event.type];
              for (var i=0, len=listeners.length; i < len; i++){
                  listeners[i].call(this, event);
              }
          }
      },
      removeListener: function(type, listener){
          if (this._listeners[type] instanceof Array){
              var listeners = this._listeners[type];
              for (var i=0, len=listeners.length; i < len; i++){
                  if (listeners[i] === listener){
                      listeners.splice(i, 1);
                      break;
                  }
              }
          }
      }
  };

  cButton.prototype.getID = function() {
    return this.id;
  };

  // --- Draws this shape to a given context ---
  cButton.prototype.draw = function(ctx) {
    ctx.font = this.textHeight+"px Arial"; // Draw Text
    ctx.textAlign = "start";
    this.textWidth = ctx.measureText(this.text).width;

    ctx.fillStyle = this.fill; // Draw Rect
    this.w = this.textWidth + 6;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = this.textFill;
    ctx.fillText(this.text, this.x+((this.w  - this.textWidth) / 2), this.textHeight+this.y);
  };

  // --- Determine if a point is inside the shape's bounds ---
  cButton.prototype.contains = function(mx, my) {
    return  (this.x <= mx) && (this.x + this.w >= mx) &&
            (this.y <= my) && (this.y + this.h >= my);
  };

  // -- CanvasState Class --
  // --- Constructor for CanvasState object ---
  function CanvasState(canvas) {
    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;
    this.ctx = canvas;

    // Track the state
    this.valid = false; // When set to false, the canvas will redraw everything
    this.shapes = [];  // Collection of things to be drawn and redrawn
    this.clickables = []; // Collection of things which are clickable
    // the current selected object. In the future we could turn this into an array for multiple selection
    this.selection = null;

    // Events
    var myState = this; // This particular CanvasState


    setInterval(function() { myState.draw(); }, myState.interval);
  }

  // --- Adds a Shape to the canvas ---
  CanvasState.prototype.addShape = function(shape) {
    this.shapes.push(shape); // Push to array
    this.valid = false; // Redraw canvas
  };

  // --- Adds a Shape to the canvas ---
  CanvasState.prototype.addClickable = function(shape) {
    this.shapes.push(shape); // Push to draw array
    this.clickables.push(shape); // Push to clickable array
    this.valid = false; // Redraw canvas
  };

  // --- Clean the canvas ---
  CanvasState.prototype.clear = function() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  };

  // --- Draw the canvas (if invalid) ---
  CanvasState.prototype.draw = function() {
    // if our state is invalid, redraw and validate!
    if (!this.valid) {
      ctx = this.ctx;
      var shapes = this.shapes;

      // draw all shapes
      var l = shapes.length;
      for (var i = 0; i < l; i++) {
        var shape = shapes[i];
        // We can skip the drawing of elements that have moved off the screen:
        shapes[i].draw(ctx);
      }

      // draw selection
      // right now this is just a stroke along the edge of the selected Shape
      if (this.selection !== null) {
        ctx.strokeStyle = this.selectionColor;
        ctx.lineWidth = this.selectionWidth;
        var mySel = this.selection;
      }

      // Add stuff you want drawn on top all the time here
      this.valid = true;
    }
  };
