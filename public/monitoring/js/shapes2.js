// ----------------------------
// - "Classes" for Canvas -
// ----------------------------

  // -- Nodes Class --
  function Node(id) {
    this.id = id || 0;
    this.nodeTitle = {};
    this.shards = []; // Contains object {'rect': shardRect, 'title': shardTitle}
    this.buttons = []; // Contains objects
  }

  Node.prototype.constructor = Node;

  Node.prototype.addNode = function(node) { // Creates a new Node
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

    for(var shard in this.shards) {
      cState.addShape( new Shape(this.shards[shard].rect) );
      cState.addShape( new Textbox(this.shards[shard].title, this.shards[shard].rect.w) );
    }

    for(var btn in this.buttons) {
      cState.addClickable(this.buttons[btn]);
    }
  };

  // -- Shape Class --
  // --- Constructor for Shape objects to hold data for all drawn objects. ---
  function Shape(shapeObj) {
    this.x = shapeObj.x || 0; // Rect setup
    this.y = shapeObj.y || 0;
    this.w = shapeObj.w || 1;
    this.h = shapeObj.h || 1;
    this.color = shapeObj.color || '#000';
  }

  // --- Draws this shape to a given context ---
  Shape.prototype.draw = function(ctx) {
    ctx.fillStyle = this.color; // Set color
    ctx.fillRect(this.x, this.y, this.w, this.h); // Draw Shape
  };

  // -- Textbox Class --
  // --- Constructor for Textbox objects to hold data for all drawn objects. ---
  function Textbox(textObj, rectW) {
    this.x = textObj.x || 0; // Text setup
    this.y = textObj.y || 0;
    this.w = textObj.w || 1;
    this.h = textObj.h || 12;
    this.color= textObj.color || '#000';
    this.text = textObj.text || "None";
    this.rectW = rectW || 0; // If placed on Box, width of Box
  }

  // --- Draws this shape to a given context ---
  Textbox.prototype.draw = function(ctx) {
    ctx.font = this.h+"px Arial"; // Draw Text
    ctx.fillStyle = this.color;
    ctx.textAlign = "start";
    this.w = ctx.measureText(this.text).width;
    ctx.fillText(this.text, this.x+((this.rectW  - this.w) / 2), this.h+this.y);
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
    // Setup
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = canvas.getContext('2d');

    // This complicates things a little but but fixes mouse co-ordinate problems
    var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
    if (document.defaultView && document.defaultView.getComputedStyle) {
      this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10) || 0;
      this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10) || 0;
      this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
      this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10) || 0;
    }

    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;

    // Track the state
    this.valid = false; // When set to false, the canvas will redraw everything
    this.shapes = [];  // Collection of things to be drawn and redrawn
    this.clickables = []; // Collection of things which are clickable
    // the current selected object. In the future we could turn this into an array for multiple selection
    this.selection = null;

    // Events
    var myState = this; // This particular CanvasState

    //fixes a problem where double clicking causes text to get selected on the canvas
    canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
    // Up, down, and move are for dragging
    canvas.addEventListener('mousedown', function(e) {
      var mouse = myState.getMouse(e);
      var mx = mouse.x;
      var my = mouse.y;
      var shapes = myState.clickables;

      for (var i = shapes.length-1; i >= 0; i--) {
        if (shapes[i].contains(mx, my)) {
          var mySel = shapes[i]; // Selected object
          mySel.fire({ type: "foo" }); // Fire clicked-Event
          myState.selection = mySel;
          myState.valid = false;
          return;
        }
      }
      // havent returned means we have failed to select anything.
      // If there was an object selected, we deselect it
      if (myState.selection) {
        myState.selection = null;
        myState.valid = false; // Need to clear the old selection border
      }
    }, true);

    // Options

    this.selectionColor = '#CC0000';
    this.selectionWidth = 2;
    this.interval = 30;
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
      var ctx = this.ctx;
      var shapes = this.shapes;
      this.clear();

      // draw all shapes
      var l = shapes.length;
      for (var i = 0; i < l; i++) {
        var shape = shapes[i];
        // We can skip the drawing of elements that have moved off the screen:
        if (shape.x > this.width || shape.y > this.height ||
            shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
        shapes[i].draw(ctx);
      }

      // draw selection
      // right now this is just a stroke along the edge of the selected Shape
      if (this.selection !== null) {
        ctx.strokeStyle = this.selectionColor;
        ctx.lineWidth = this.selectionWidth;
        var mySel = this.selection;
        ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
      }

      // Add stuff you want drawn on top all the time here
      this.valid = true;
    }
  };

  // --- Get MousePos on the Canvas ---
  CanvasState.prototype.getMouse = function(e) {
    var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;

    // Compute the total offset
    if (element.offsetParent !== undefined) {
      do {
        offsetX += element.offsetLeft;
        offsetY += element.offsetTop;
      } while ((element = element.offsetParent));
    }

    // Add padding and border style widths to offset
    // Also add the <html> offsets in case there's a position:fixed bar
    offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
    offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

    mx = e.pageX - offsetX;
    my = e.pageY - offsetY;

    // We return a simple javascript object (a hash) with x and y defined
    return {x: mx, y: my};
  };
