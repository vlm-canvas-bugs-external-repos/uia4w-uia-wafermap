(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('pixi.js')) :
  typeof define === 'function' && define.amd ? define(['exports', 'pixi.js'], factory) :
  (global = global || self, factory(global.uia = global.uia || {}, global.PIXI));
}(this, (function (exports, PIXI$1) { 'use strict';

  /**
   * merge the grade of all layers.
   * @param {int} drawR The row index of drawing.
   * @param {int} drawC The column index of drawing.
   * @return {int) -1: unknown, others: bin code.
   */
  function waferdata_bincode(drawR, drawC, dx, dy, dw, dh) {
    // find out die(row,col) at drawing(drawR,drawC)
    var pos = this.pos(drawR, drawC);
    var rowOffset = pos.row - this.minRow;
    var colOffset = pos.col - this.minCol;
    for (var i = this.layers.length; i > 0; i--) {
      var _layer = this.layers[i - 1];
      if (_layer.enabled()) {
        var code = _layer.result(rowOffset, colOffset, dx, dy, dw, dh);
        if (code >= 0) {
          return code;
        }
      }
    }
    return -1;
  }

  /**
   * merge the grade of all layers.
   * @param {int} drawR The row index of drawing.
   * @param {int} drawC The column index of drawing.
   * @return {int) 0: pass, -1: unknown, others: failed count.
   */
  function waferdata_counting(drawR, drawC, dx, dy, dw, dh) {
    // find out die(row,col) at drawing(drawR,drawC)
    var pos = this.pos(drawR, drawC);
    var rowOffset = pos.row - this.minRow;
    var colOffset = pos.col - this.minCol;

    var found = false;
    var result = 0;
    for (var i = 0; i < this.layers.length; i++) {
      var _layer = this.layers[i];
      if (_layer.enabled()) {
        var fail = _layer.result(rowOffset, colOffset, dx, dy, dw, dh);
        if (fail >= 0) {
          found = true;
          result += fail;
        }
      }
    }
    return found ? result : -1;
  }

  function layer_enabled(on, redraw = true) {
    if (on === undefined) {
      return this.on;
    } else {
      this.on = on;
      if (redraw) {
        this.shotmap.draw();
      }
      return this;
    }
  }

  function layer(id, shotmap, testResult, dataPicker, on) {
    return new Layer(id, shotmap, testResult, dataPicker, on);
  }

  function Layer(id, shotmap, testResult, dataPicker = undefined, on = true) {
    this.id = id;
    this.shotmap = shotmap;
    this.on = on;
    if (typeof testResult === "function") {
      this.testResultF = testResult;
    } else {
      this.testResultF = function() { return testResult };
    }
    this.dataPicker = dataPicker;
  }

  Layer.prototype = {

    constructor: Layer,

    enabled: layer_enabled,

    /**
     * Get test result from die matrix. 
     * @param {int} rowOffset The row offset of min row.
     * @param {int} colOffset The column offset of min column. 
     * @returns 0: pass, 1: failed, -1: unknown.
     */
    result: function(rowOffset, colOffset, dx, dy, dw, dh) {
      return this.testResultF(rowOffset, colOffset, dx, dy, dw, dh);
    },

    resultX: function(x, y, dx, dy, dw, dh) {
      return this.testResultF(x, y, dx, dy, dw, dh);
    },

    /**
     * Get information from die matrix.
     * @param {int} rowOffset The row offset of min row.
     * @param {int} colOffset The column offset of min column. 
     * @returns {any} The information.
     */
    data: function(rowOffset, colOffset, dx, dy, dw, dh) {
      return this.dataPicker ? this.dataPicker(rowOffset, colOffset, dx, dy, dw, dh) : null;
    }

  };

  /**
   * Create a new layer.
   * @param {string} id The id.
   * @param {function} resultTester The test function.
   * @param {function} dataPicker The data picker.
   * @returns {uia.Layer} The layer object.
   */
  function waferdata_layer(id, resultTester, dataPicker, on = true) {
    if (resultTester === undefined) {
      return this.layers.find(function(layer) {
        return layer.id == id;
      });
    }

    this.layers = this.layers.filter(function(layer) {
      return layer.id != id;
    });
    this.layers.push(layer(id, this.shotmap, resultTester, dataPicker, on));
    return this;
  }

  function waferdata_left_down(drawRow, drawCol) {
    var x = drawCol;
    var y = this.rows - drawRow - 1;
    return {
      row: this.minRow + y,
      col: this.minCol + x
    };
  }

  function waferdata_left_down_r(row, col) {
    return {
      drawRow: this.minRow + this.rows - row - 1,
      drawCol: col - this.minCol
    };
  }

  function waferdata_left_up(drawRow, drawCol) {
    return {
      row: this.minRow + drawRow,
      col: this.minCol + drawCol
    };
  }

  function waferdata_left_up_r(row, col) {
    return {
      drawRow: row - this.minRow,
      drawCol: col - this.minCol
    };
  }

  /**
   * merge the grade of all layers.
   * @param {int} drawR The row index of drawing grid.
   * @param {int} drawC The column index of drawing grid.
   * @return {int) 0:pass, 1:failed, 2:good to bad, 3:good to good, -1:unknown.
   */
  function waferdata_testing(drawR, drawC, dx, dy, dw, dh) {
    // find out die(row,col) at drawing(drawR,drawC)
    var pos = this.pos(drawR, drawC);
    var rowOffset = pos.row - this.minRow; // from zero
    var colOffset = pos.col - this.minCol; // from zero

    var found = false;
    var pass = false;
    for (var i = 0; i < this.layers.length; i++) {
      var _layer = this.layers[i];
      if (_layer.enabled()) {
        var code = _layer.result(rowOffset, colOffset, dx, dy, dw, dh);
        if (code >= 0) {
          if (pass && code > 0) {
            return 2; // good to bad
          } else if (pass && found) {
            return 3; // test duo
          }
          pass = (code == 0);
          found = true;
        }
      }
    }
    return found ? pass ? 0 : 1 : -1;
  }

  function waferdata_mode(pickMode) {
    if (pickMode == "counting") {
      this.testing = waferdata_counting;
    } else if (pickMode == "bincode") {
      this.testing = waferdata_bincode;
    } else {
      this.testing = waferdata_testing;
    }
    return this;
  }

  /**
   * merge the grade of all layers.
   * @param {int} drawR The row index of drawing.
   * @param {int} drawC column index of drawing.
   * @return {int) 0: pass, 1: failed, -1: unknown.
   */
  function waferdata_pick(drawR, drawC) {
    var data = [];
    // find out die(row,col) at drawing(drawR,drawC)
    var pos = this.pos(drawR, drawC);
    this.layers.forEach(l => {
      data.push(l.data(pos.row - this.minRow, pos.col - this.minCol));
    });
    return data;
  }

  function waferdata_right_down(drawRow, drawCol) {
    var x = this.cols - drawCol - 1;
    var y = this.rows - drawRow - 1;
    return {
      row: this.minRow + y,
      col: this.minCol + x
    };
  }

  function waferdata_right_down_r(row, col) {
    return {
      drawRow: this.minRow + this.rows - row - 1,
      drawCol: this.minCol + this.cols - col - 1
    };
  }

  function waferdata_right_up(drawRow, drawCol) {
    var x = this.cols - drawCol - 1;
    var y = drawRow;
    return {
      row: this.minRow + y,
      col: this.minCol + x
    };
  }

  function waferdata_right_up_r(row, col) {
    return {
      drawRow: row - this.minRow,
      drawCol: this.minCol + this.cols - col - 1
    };
  }

  function waferdata_scan() {
    var dies = [];
    for (var drawR = 0; drawR < this.rows; drawR++) {
      for (var drawC = 0; drawC < this.cols; drawC++) {
        var pos = this.pos(drawR, drawC);
        var rowOffset = pos.row - this.minRow; // from zero
        var colOffset = pos.col - this.minCol; // from zero
        var die = {
          x: pos.col,
          y: pos.row,
          pass: false,
          code: -1,
          type: null,
        };
        for (var i = 0; i < this.layers.length; i++) {
          var _layer = this.layers[i];
          if (!_layer.enabled()) {
            continue;
          }
          var code = _layer.result(rowOffset, colOffset);
          if (code < 0) {
            continue;
          }

          die.code = code;
          if (code == 0) {
            if (die.pass) {
              die.type = die.type ? die.type + "Good" : "GoodGood";
            } else if (die.type != null) {
              die.type = die.type + "Good";
            }
            die.pass = true;
            die.data = null;
          } else {
            if (die.pass) {
              die.type = "GoodBad";
            }
            die.pass = false;
            die.data = _layer.data(rowOffset, colOffset);
          }
        }
        if (die.code >= 0) {
          dies.push(die);
        }
      }
    }
    return dies;
  }

  function waferdata(shotmap, maxRow, maxCol, minRow, minCol, origin, pickMode) {
    return new WaferData(shotmap, maxRow, maxCol, minRow, minCol, origin, pickMode);
  }

  function WaferData(shotmap, maxRow, maxCol, minRow, minCol, origin = "leftdown", pickMode = "testing") {
    this.shotmap = shotmap;
    this.maxRow = maxRow;
    this.maxCol = maxCol;
    this.minRow = minRow;
    this.minCol = minCol;
    this.rows = maxRow - minRow + 1;
    this.cols = maxCol - minCol + 1;
    this.layers = new Array();

    if (origin == "rightup" || origin == "ru") {
      this.pos = waferdata_right_up;
      this.posR = waferdata_right_up_r;
    } else if (origin == "rightdown" || origin == "rd") {
      this.pos = waferdata_right_down;
      this.posR = waferdata_right_down_r;
    } else if (origin == "leftup" || origin == "lu") {
      this.pos = waferdata_left_up;
      this.posR = waferdata_left_up_r;
    } else {
      this.pos = waferdata_left_down;
      this.posR = waferdata_left_down_r;
    }

    if (typeof pickMode === 'function') {
      pickMode.bind(this);
      this.testing = pickMode;
    } else if (pickMode == "counting") {
      this.testing = waferdata_counting;
    } else if (pickMode == "bincode") {
      this.testing = waferdata_bincode;
    } else {
      this.testing = waferdata_testing;
    }
    this.bincode = waferdata_bincode;
  }

  WaferData.prototype = {
    constructor: WaferData,
    layer: waferdata_layer,
    mode: waferdata_mode,
    pick: waferdata_pick,
    scan: waferdata_scan
  };

  function shotmap_attach_click(fHandler) {
    this.clickHandler = fHandler;
    return this;
  }

  function shotmap_attach_hover_in(fHandler) {
    this.hoverInHandler = fHandler;
    return this;
  }

  function shotmap_attach_hover_out(fHandler) {
    this.hoverOutHandler = fHandler;
    return this;
  }

  // import { ArrayResource } from "pixi.js/dist/browser/pixi";

  function shotmap_blocking(blur = 9, bg = null) {
    let canvas = this.extract("canvas");
    let src = cv.imread(canvas);
    let dst = new cv.Mat();

    cv.medianBlur(src, src, blur % 2 == 0 ? blur + 1 : blur);

    let masked = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC1);
    let subtractor = new cv.BackgroundSubtractorMOG2(500, 16, true);
    subtractor.apply(src, masked);

    cv.threshold(src, dst, 0, 255, cv.THRESH_BINARY);

    var width = canvas.width;
    var height = canvas.height;

    var data = new Array(height);
    for (var y = 0; y < height; y++) {
      data[y] = new Array(width);
      for (var x = 0; x < width; x++) {
        data[y][x] = 0;
      }
    }

    var links = [];
    var aid = 1;
    for (var y = 1; y < height - 1; y++) {
      var row = data[y];
      for (var x = 1; x < width - 1; x++) {
        var ignore = nav(dst, x, y, bg) || (
          nav(dst, x - 1, y - 1, bg) &&
          nav(dst, x, y - 1, bg) &&
          nav(dst, x + 1, y - 1, bg) &&
          nav(dst, x - 1, y, bg) &&
          nav(dst, x + 1, y, bg) &&
          nav(dst, x - 1, y + 1, bg) &&
          nav(dst, x, y + 1, bg) &&
          nav(dst, x + 1, y + 1, bg));

        if (!ignore) {
          // 1 2 3
          // 4 ? .
          var a1 = data[y - 1][x - 1];
          var a2 = data[y - 1][x];
          var a3 = data[y - 1][x + 1];
          var a4 = row[x - 1];
          if (a4 != 0) {
            row[x] = a4;
          } else if (a1 != 0) {
            row[x] = a1;
          } else if (a2 != 0) {
            row[x] = a2;
          } else if (a3 != 0) {
            row[x] = a3;
          } else {
            row[x] = aid++;
          }

          // link tow areas
          if (a3 != 0 && row[x] != a3) {
            var aid1 = Math.min(row[x], a3);
            var aid2 = Math.max(row[x], a3);
            if (!links.find(link => link[0] == aid1 && link[1] == aid2)) {
              links.push([aid1, aid2]);
            }
          }
        }
      }
    }

    aid = width * height;
    var areaLinks = {};
    var groups = grouping(links);
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      group.forEach(id => areaLinks[id] = aid);
      aid++;
    }

    // area
    var areas = {};
    for (var y = 0; y < height; y++) {
      var row = data[y];
      for (var x = 0; x < width; x++) {
        if (row[x] != 0) {
          row[x] = areaLinks[row[x]] || row[x];
          areas[row[x]] = areas[row[x]] || { id: row[x], pts: 0 };
          areas[row[x]].pts++;

        }
      }
    }
    var sorted = Object.values(areas).sort((a, b) => b.pts - a.pts);
    for (var r = 0; r < sorted.length; r++) {
      sorted[r]["rank"] = r;
    }

    src.delete();
    dst.delete();

    var result = {
      data: data,
      areas: areas
    };
    result["draw"] = __draw.bind(result);
    result["tester"] = __tester.bind(result);
    return result;
  }

  function nav(src, x, y, background) {
    let r = src.ucharAt(y, x * src.channels());
    let g = src.ucharAt(y, x * src.channels() + 1);
    let b = src.ucharAt(y, x * src.channels() + 2);
    let rgb = r << 16 || g << 8 || b;
    return (background != null && background == rgb) || (r == 255 && g == 255 && b == 255) || (r == 0 && g == 0 && b == 0);
  }

  function __tester(_row, _col, dx, dy, _dw, _dh) {
    var row = this.data[Math.min(this.data.length - 1, parseInt(dy))];
    var aid = row[Math.min(row.length - 1, parseInt(dx))];
    if (aid == 0) {
      return -1;
    }
    var area = this.areas[aid];
    return area ? area.rank : -1;
  }

  function __draw(canvas) {
    if (this.data.length == 0) {
      return;
    }

    var colors = ["red", "green", "blue", "gray", "lightgray"];
    var ctx = canvas.getContext("2d");
    ctx.canvas.height = this.data.length;
    ctx.canvas.width = this.data[0].length;
    for (var y = 0; y < this.data.length; y++) {
      var row = this.data[y];
      for (var x = 0; x < row.length; x++) {
        var aid = row[x]; // area id
        if (aid == 0) {
          continue;
        }
        var area = this.areas[aid]; // area information
        if (!area || area.rank >= 5) {
          continue;
        }

        ctx.fillStyle = colors[area.rank];
        ctx.fillRect(x, y, 1, 1);
        ctx.fill();
      }
    }
  }

  function grouping(links) {
    var result = [];
    var merge = false;
    for (var l = 0; l < links.length; l++) {
      var link = links[l];
      var found = null;
      for (var r = 0; r < result.length; r++) {
        var one = result[r];
        for (var x = 0; x < link.length; x++) {
          if (one.find(o => o == link[x])) {
            found = one;
            break;
          }
        }
        if (found != null) {
          break;
        }
      }

      if (!found) {
        result.push(link);
      } else {
        merge = true;
        for (var x = 0; x < link.length; x++) {
          if (!found.find(o => o == link[x])) {
            found.push(link[x]);
          }
        }
      }
    }
    if (merge) {
      return grouping(result);
    } else {
      return result;
    }
  }

  function shotmap_circleBackground(enabled) {
    if (arguments.length > 0) {
      this.circleBackgroundEnabled = enabled;
      return this;
    }
    return this.circleBackgroundEnabled;
  }

  /**
   * create shotmap without data
   * 
   * @param {boolean} diesGrid Draw grid line of dies.
   */
  function shotmap_create(checkBounding = false) {
    this.checkBounding = checkBounding;

    // width/height
    var w = this.diameter;
    var r = this.diameter / 2;
    var rm = (this.diameter - this.margin) / 2;

    // pixi
    if (!this.app) {
      this.app = new PIXI$1.Application({
        width: w,
        height: w,
        backgroundAlpha: 0,
        autoStart: false
      });

      var div = document.getElementById(this.id());
      if (div) {
        var child = div.lastChild;
        while (child) {
          div.removeChild(child);
          child = div.lastChild;
        }

        div.setAttribute("style", "width:" + w + "px");
        div.setAttribute("style", "height:" + w + "px");
        div.appendChild(this.app.view);
      }

      // circle
      // circle: wafer
      if (this.circleBackgroundEnabled) {
        const map = new PIXI$1.Graphics();
        map.lineStyle(0);
        map.beginFill(0x999999);
        map.drawCircle(r, r, r);
        map.endFill();
        // circle: margin
        map.beginFill(0xeeeeee);
        map.drawCircle(r, r, rm);
        map.endFill();
        this.app.stage.addChild(map);
      }

      // zoom
      var self = this;
      var down = false;
      this.app.view.addEventListener('mousewheel', function(e) {
        if (!self.wheelEnabled) {
          self.reset();
        } else if (e.deltaY >= 0) {
          self.zoomIn(e.offsetX, e.offsetY);
        } else {
          self.zoomOut(e.offsetX, e.offsetY);
        }
      });
      this.app.view.addEventListener('mousedown', function(e) {
        down = true;
        if (!self.dragEnabled) {
          return;
        }
        self.move(e.offsetX, e.offsetY, "mousedown");
      });
      this.app.view.addEventListener('mouseup', function(e) {
        down = false;
        if (!self.dragEnabled) {
          return;
        }
        self.move(e.offsetX, e.offsetY, "mouseup");
      });
      this.app.view.addEventListener('mousemove', function(e) {
        if (!self.dragEnabled) {
          if (down && e.movementX < -10) {
            self.reset();
            down = false;
          }
          return;
        }
        self.move(e.offsetX, e.offsetY, "mousemove");
      });
      this.app.view.addEventListener('dblclick', function(e) {
        self.zoomIn(e.offsetX, e.offsetY);
      });

    }

    // draw dies
    this.draw();
    return this;
  }

  /**
   * creates empty data of the wafer.
   * 
   * @param {int} maxRow 
   * @param {int} maxCol 
   * @param {int} minRow
   * @param {int} direction
   * @param {}
   * @param {int} minCol 
   * @return {uia.WaferData} The wafer data.
   */
  function shotmap_data(maxRow, maxCol, minRow = 1, minCol = 1, origin = "leftdown", pickMode = "testing") {
    if (origin == undefined || origin == null) {
      origin = "leftdown";
    }
    if (pickMode == undefined || pickMode == null) {
      origin = "testing";
    }
    this.waferdata = waferdata(this, maxRow, maxCol, minRow, minCol, origin.toLowerCase(), pickMode);
    var w = 0.94 * (this.diameter - this.margin);
    this.dieWidth = w / this.waferdata.cols;
    this.dieHeight = w / this.waferdata.rows;
    return this.waferdata;
  }

  /**
   * DiePalette property.
   * 
   * @param {function} colorPicker A function to provide the color depending on the grade of the die.
   */
  function shotmap_die_palette(pickerFunc) {
    if (pickerFunc === undefined) {
      return this.colorPicker || defaultColorPicker;
    }

    this.colorPicker = pickerFunc;
    return this;
  }

  function defaultColorPicker(result) {
    return result == 0 ? 0x009900 : 0xff0000;
  }

  function shotmap_die_rect(enabled) {
    if (arguments.length > 0) {
      this.dieRectEnabled = enabled;
      return this;
    }
    return this.dieRectEnabled;
  }

  function shotmap_drag(enabled) {
    if (arguments.length > 0) {
      this.dragEnabled = enabled;
      return this;
    }
    return this.dragEnabled;
  }

  /**
   * draws shotmap with data.
   *
   */
  function shotmap_draw() {
    if (this.dies) {
      this.dies.destroy();
    }
    if (!this.app) {
      return;
    }

    this.dies = new PIXI$1.Graphics();

    // width/height
    var w = this.diameter;
    var r = this.diameter / 2;
    var rm = (this.diameter - this.margin) / 2;

    // width/height: die
    var dw = this.dieWidth;
    var dh = this.dieHeight;

    var dx0 = (w - dw * this.waferdata.cols) / 2;
    var dy0 = (w - dh * this.waferdata.rows) / 2;
    if (this.notchSide == "left" || this.notchSide == "l") {
      dx0 += dw * this.notchOffset;
    } else if (this.notchSide == "right" || this.notchSide == "r") {
      dx0 -= dw * this.notchOffset;
    } else if (this.notchSide == "up" || this.notchSide == "u") {
      dy0 += dh * this.notchOffset;
    } else {
      dy0 -= dh * this.notchOffset;
    }

    // grid: dies
    var dy = dy0;
    for (var drawRow = 0; drawRow < this.waferdata.rows; drawRow++) {
      var dx = dx0;
      for (var drawCol = 0; drawCol < this.waferdata.cols; drawCol++) {
        var inCircle = this.checkBounding ? inside(dx, dy, dw, dh, r, r, rm) : true;

        // testResult: diff from 'testing', 'counting', 'bincode'
        var testResult = this.waferdata.testing(drawRow, drawCol, dx, dy, dw, dh);
        if (inCircle && testResult >= 0) {
          var color = testResult < 0 ? 0xeeeeee : this.diePalette()(testResult) || 0xeeeeee;
          if (this.highCode != null && this.waferdata.bincode(drawRow, drawCol, dx, dy, dw, dh) == this.highCode) {
            color = this.highColor;
          }
          var die = createDie(this, drawRow, drawCol, dx, dy, dw, dh, color);
          this.dies.addChild(die);
        }
        dx += dw;
      }
      dy += dh;
    }
    this.app.stage.addChild(this.dies);

    this.app.render();
  }

  function createDie(map, drawRow, drawCol, dx, dy, dw, dh, color) {
    var die = new PIXI$1.Graphics();
    die["info"] = {
      drawRow: drawRow,
      drawCol: drawCol,
      x: dx,
      y: dy
    };
    if (map.dieRectEnabled) {
      die.lineStyle(1, 0xcccccc, dw / 10);
    }
    die.beginFill(color);
    die.drawRect(dx, dy, dw, dh);
    die.endFill();
    die.interactive = true;
    die.on("mousedown", function(e) {
      if (map.clickHandler) {
        var _die = e.target;
        map.clickHandler({
          source: _die,
          data: map.waferdata,
          point: e.data.global,
          pick: function() {
            return map.waferdata.pick(_die.info.drawRow, _die.info.drawCol);
          }
        });
      }
    });
    die.on("mouseover", function(e) {
      if (map.hoverInHandler) {
        var _die = e.target;
        map.hoverInHandler({
          source: _die,
          data: map.waferdata,
          point: e.data.global,
          pick: function() {
            return map.waferdata.pick(_die.info.drawRow, _die.info.drawCol);
          }
        });
      }
    });
    die.on("mouseout", function(e) {
      if (map.hoverOutHandler) {
        var _die = e.target;
        map.hoverOutHandler({
          source: _die,
          data: map.waferdata,
          point: e.data.global,
          pick: function() {
            return map.waferdata.pick(_die.info.drawRow, _die.info.drawCol);
          }
        });
      }
    });
    return die;
  }

  function inside(x, y, w, h, cx, cy, r) {
    var r2 = r * r;
    return dist(x, y, cx, cy) < r2 &&
      dist(x + w, y, cx, cy) < r2 &&
      dist(x, y + h, cx, cy) < r2 &&
      dist(x + w, y + h, cx, cy) < r2;
  }

  function dist(x, y, cx, cy) {
    return (x - cx) * (x - cx) + (y - cy) * (y - cy);
  }

  function shotmap_extract(type = "canvas") {
    if (!this.app) {
      return null;
    }

    const bg = new PIXI.Graphics();
    bg.beginFill(0xffffff);
    bg.drawRect(0, 0, this.diameter, this.diameter);
    bg.addChild(this.dies);

    if (type == "image") {
      return this.app.renderer.plugins.extract.image(bg, "image/png");
    } else if (type == "base64") {
      return this.app.renderer.plugins.extract.base64(bg, "image/png");
    } else {
      return this.app.renderer.plugins.extract.canvas(bg);
    }
  }

  function shotmap_highlight(highCode, highColor = 0xffff00) {
    if (arguments.length > 0) {
      this.highCode = highCode;
      this.highColor = highColor;
      return this;
    }
    return {
      code: this.highCode,
      color: this.highColor
    };
  }

  function shotmap_move(offsetX, offsetY, event) {
    if (event == 'mousedown') {
      this.lastPos = {
        x: offsetX,
        y: offsetY
      };
    } else if (event == 'mousemove') {
      if (this.lastPos) {
        var stage = this.app.stage;
        stage.x += (offsetX - this.lastPos.x);
        stage.y += (offsetY - this.lastPos.y);
        this.lastPos = {
          x: offsetX,
          y: offsetY
        };
        this.app.render();
      }
    } else {
      this.lastPos = null;
    }
  }

  /**
   * visibility property.
   *
   */
  function shotmap_notch(side, offset = 1) {
    this.notchSide = side.toLowerCase();
    this.notchOffset = offset;
    return this;
  }

  function shotmap_reset() {
    this.app.stage.x = 0;
    this.app.stage.y = 0;
    this.app.stage.scale.x = 1;
    this.app.stage.scale.y = 1;

    this.app.render();

    return this;
  }

  function shotmap_scan() {
    return this.waferdata.scan();
  }

  function shotmap_select_die(row, col, color = 0xffff00) {
    if (this.selectedDie) {
      this.selectedDie.destroy();
    }
    if (!this.app || arguments.length == 0) {
      return;
    }

    var posR = this.waferdata.posR(row, col);

    var dw = this.dieWidth;
    var dh = this.dieHeight;

    var dx0 = (this.diameter - dw * this.waferdata.cols) / 2;
    var dy0 = (this.diameter - dh * this.waferdata.rows) / 2;
    if (this.notchSide == "left" || this.notchSide == "l") {
      dx0 += dw * this.notchOffset;
    } else if (this.notchSide == "right" || this.notchSide == "r") {
      dx0 -= dw * this.notchOffset;
    } else if (this.notchSide == "up" || this.notchSide == "u") {
      dy0 += dh * this.notchOffset;
    } else {
      dy0 -= dh * this.notchOffset;
    }
    var dx = dx0 + dw * posR.drawCol;
    var dy = dy0 + dh * posR.drawRow;

    this.selectedDie = createDie$1(this, posR.drawRow, posR.drawCol, dx, dy, dw, dh, color);
    this.app.stage.addChild(this.selectedDie);
    this.app.render();
  }

  function createDie$1(map, row, col, dx, dy, dw, dh, color) {
    var die = new PIXI.Graphics();
    die["info"] = {
      drawRow: row,
      drawCol: col,
      x: dx,
      y: dy
    };
    if (map.dieRectEnabled) {
      die.lineStyle(1, 0xcccccc, dw / 10);
    }
    die.beginFill(color);
    die.drawRect(dx, dy, dw, dh);
    die.endFill();
    die.interactive = true;
    die.on("mousedown", function(e) {
      if (map.clickHandler) {
        var _die = e.target;
        map.clickHandler({
          source: _die,
          data: map.waferdata,
          point: e.data.global,
          pick: function() {
            return map.waferdata.pick(_die.info.drawRow, _die.info.drawCol);
          }
        });
      }
    });
    die.on("mouseover", function(e) {
      if (map.hoverInHandler) {
        var _die = e.target;
        map.hoverInHandler({
          source: _die,
          data: map.waferdata,
          point: e.data.global,
          pick: function() {
            return map.waferdata.pick(_die.info.drawRow, _die.info.drawCol);
          }
        });
      }
    });
    die.on("mouseout", function(e) {
      if (map.hoverOutHandler) {
        var _die = e.target;
        map.hoverOutHandler({
          source: _die,
          data: map.waferdata,
          point: e.data.global,
          pick: function() {
            return map.waferdata.pick(_die.info.drawRow, _die.info.drawCol);
          }
        });
      }
    });
    return die;
  }

  /**
   * sets wafer information.
   * 
   * @param {int} diameter The size.
   * @param {int} margin The margin size.
   */
  function shotmap_size(diameter, margin = 10) {
    this.diameter = diameter;
    this.margin = margin;
    return this;
  }

  /**
   * sets wafer information.
   * 
   * @param {int} diameter The size.
   * @param {int} margin The margin size.
   */
  function shotmap_wafer(diameter, margin = 10) {
    this.diameter = diameter * 3; // replaced by size()
    this.margin = margin;
    return this;
  }

  function shotmap_wheel(enabled) {
    if (arguments.length > 0) {
      this.wheelEnabled = enabled;
      return this;
    }
    return this.wheelEnabled;
  }

  function shotmap_zoom_in(offsetX, offsetY) {
    var stage = this.app.stage;
    // center
    if (offsetX === undefined) {
      offsetX = stage.x + this.diameter * stage.scale.x / 2;
      offsetY = stage.y + this.diameter * stage.scale.y / 2;
    }

    var worldPos = {
      x: (offsetX - stage.x) / stage.scale.x,
      y: (offsetY - stage.y) / stage.scale.y
    };
    var newScale = {
      x: stage.scale.x * 2,
      y: stage.scale.y * 2
    };
    var newScreenPos = {
      x: worldPos.x * newScale.x + stage.x,
      y: worldPos.y * newScale.y + stage.y
    };

    stage.x -= (newScreenPos.x - offsetX);
    stage.y -= (newScreenPos.y - offsetY);
    stage.scale.x = newScale.x;
    stage.scale.y = newScale.y;

    this.app.render();

    return this;
  }

  function shotmap_zoom_out(offsetX, offsetY) {
    var stage = this.app.stage;
    // center
    if (offsetX === undefined) {
      offsetX = stage.x + this.diameter * stage.scale.x / 2;
      offsetY = stage.y + this.diameter * stage.scale.y / 2;
    }

    var worldPos = {
      x: (offsetX - stage.x) / stage.scale.x,
      y: (offsetY - stage.y) / stage.scale.y
    };
    var newScale = {
      x: stage.scale.x * 0.5,
      y: stage.scale.y * 0.5
    };
    var newScreenPos = {
      x: worldPos.x * newScale.x + stage.x,
      y: worldPos.y * newScale.y + stage.y
    };

    stage.x -= (newScreenPos.x - offsetX);
    stage.y -= (newScreenPos.y - offsetY);
    stage.scale.x = newScale.x;
    stage.scale.y = newScale.y;

    this.app.render();

    return this;
  }

  /**
   * new ShotMap object. 
   * 
   * @param {string} The id.
   * @return {uia.ShotMap} The shotmap object.
   */
  function shotmap(elementId) {
    return new ShotMap(elementId);
  }

  /**
   * The constructor.
   * 
   * @param {string} The id.
   */
  function ShotMap(id) {
    var _id = id;
    this.id = function() {
      return _id;
    };

    // create
    this.diameter = 600;
    this.margin = 10;
    // notch
    this.notchSide = "down";
    this.notchOffset = 1;
    // wheel
    this.wheelEnabled = false;
    // drag
    this.dragEnabled = false;
    //
    this.dieRectEnabled = true;
    this.circleBackgroundEnabled = true;

    this.highCode = null;
  }

  ShotMap.prototype = (function() {
    return {
      constructor: ShotMap,
      attachClick: shotmap_attach_click,
      attachHoverIn: shotmap_attach_hover_in,
      attachHoverOut: shotmap_attach_hover_out,
      blocking: shotmap_blocking,
      circleBackground: shotmap_circleBackground,
      create: shotmap_create,
      data: shotmap_data,
      diePalette: shotmap_die_palette,
      dieRect: shotmap_die_rect,
      extract: shotmap_extract,
      drag: shotmap_drag,
      draw: shotmap_draw,
      highlight: shotmap_highlight,
      move: shotmap_move,
      notch: shotmap_notch,
      reset: shotmap_reset,
      scan: shotmap_scan,
      selectDie: shotmap_select_die,
      size: shotmap_size,
      wafer: shotmap_wafer,
      wheel: shotmap_wheel,
      zoomIn: shotmap_zoom_in,
      zoomOut: shotmap_zoom_out
    };
  }());

  function maplegend_draw() {
    // pixi
    if (!this.app) {
      this.app = new PIXI$1.Application({
        width: this.width,
        height: this.height,
        backgroundAlpha: 0,
        autoStart: false
      });

      var div = document.getElementById(this.id());
      div.setAttribute("style", "width:" + this.width + "px");
      div.setAttribute("style", "height:" + this.height + "px");
      div.appendChild(this.app.view);

      if (this.gs) {
        this.gs.destroy();
      }

      this.gs = new PIXI$1.Graphics();
      var x1 = 0;
      for (var i = 0; i < this.colors.length; i++) {
        var x2 = (i + 1) * this.width / this.colors.length;

        var color = new PIXI$1.Graphics();
        color.beginFill(this.colors[i]);
        color.drawRect(x1, 0, x2 - x1, this.height);
        color.endFill();
        this.gs.addChild(color);

        x1 = x2;
      }

      this.app.stage.addChild(this.gs);
      this.app.render();
    }

    return this;
  }

  function maplegend_range(min, max) {
    this.min = min;
    this.max = max;
    return this;
  }

  /**
   * sets wafer information.
   * 
   * @param {int} value The value.
   */
  function maplegend_select(value) {
    var idx = Math.floor(this.colors.length * (value - this.min) / (this.max - this.min));
    return this.colors.length == 0 ?
      0xffffff :
      this.colors[Math.min(Math.max(0, idx), this.colors.length - 1)];
  }

  /**
   * sets wafer information.
   * 
   * @param {int} diameter The size.
   * @param {int} margin The margin size.
   */
  function maplegend_size(width, height) {
    this.width = width;
    this.height = height;
    return this;
  }

  /**
   * sets wafer information.
   * 
   * @param {array} palette The colors.
   */
  function maplegend_palette(colors) {
    if (arguments.length == 0) {
      return this.colors;
    } else {
      this.colors = colors;
      return this;
    }
  }

  function maplegend(id, pattern = 0) {
    return new MapLegend(id, pattern);
  }

  /**
   * The constructor.
   * 
   * @param {string} The id.
   */
  function MapLegend(id, pattern) {
    var _id = id;
    this.id = function() {
      return _id;
    };
    this.width = 600;
    this.height = 20;
    this.min = -1;
    this.max = 4;
    this.colors = pattern == 0 ? [
      0xffffff, //  0
      0xd5e5fa, //  0-10
      0x92b0ff, // 10-20
      0x6271fd, // 20-30
      0x009c95, // 30-40
      0x64ff00, // 40-50
      0xc5ff30, // 50-60
      0xf7c50c, // 60-70
      0xf18008, // 70-80
      0xff1800, // 80-90
      0x990000
    ] : [
      0xFF4A00,
      0xFF4A00,
      0xFFAE00,
      0xFFAE00,
      0xDCFF00,
      0xDCFF00,
      0x68FF00,
      0x68FF00,
      0x00FF7F,
      0x00FF7F,
      0x009900,
      0x009900,
      0x00FFF4,
      0x00FFF4,
      0x0097FF,
      0x0097FF,
      0x0023FF,
      0x0023FF,
      0x5100FF,
      0x5100FF,
      0xC500FF,
      0xC500FF
    ];
  }

  MapLegend.prototype = (function() {
    return {
      constructor: MapLegend,
      draw: maplegend_draw,
      range: maplegend_range,
      palette: maplegend_palette,
      select: maplegend_select,
      size: maplegend_size
    };
  }());

  exports.maplegend = maplegend;
  exports.shotmap = shotmap;
  exports.waferdata = waferdata;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
