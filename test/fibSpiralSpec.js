describe('fibonacci spiral directive', function() {
  var compile;
  var outerScope;
  var realGetContext;
  var calls;

  // Records every drawing operation the directive performs, so the specs can
  // assert on the geometry instead of just on the presence of a <canvas> tag.
  function recordingContext() {
    var ctx = {
      fillStyle: null,
      strokeStyle: null,
      lineWidth: null,
      fillRect: function(x, y, w, h) {
        calls.push({ op: 'fillRect', x: x, y: y, w: w, h: h, fillStyle: ctx.fillStyle });
      },
      beginPath: function() { calls.push({ op: 'beginPath' }); },
      setTransform: function(a, b, c, d, e, f) {
        calls.push({ op: 'setTransform', a: a, b: b, c: c, d: d, e: e, f: f });
      },
      clearRect: function(x, y, w, h) {
        calls.push({ op: 'clearRect', x: x, y: y, w: w, h: h });
      },
      arc: function(x, y, r, start, end) {
        calls.push({ op: 'arc', x: x, y: y, r: r, start: start, end: end });
      },
      stroke: function() { calls.push({ op: 'stroke', strokeStyle: ctx.strokeStyle }); }
    };
    return ctx;
  }

  beforeEach(function() {
    module('fibonacci');

    inject(function($compile, $rootScope) {
      compile = $compile;
      outerScope = $rootScope.$new();
    });

    calls = [];
    realGetContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = recordingContext;
  });

  afterEach(function() {
    window.HTMLCanvasElement.prototype.getContext = realGetContext;
  });

  // Compiles the directive on a canvas of the given size and returns the
  // resulting element. Drawing happens during $digest, so `calls` is populated
  // by the time this returns.
  function render(width, height) {
    var element = angular.element(
      '<div><div fibonacci width="' + width + '" height="' + height + '"></div></div>');
    compile(element)(outerScope);
    outerScope.$digest();
    return element;
  }

  function rects() {
    return calls.filter(function(call) { return call.op === 'fillRect'; });
  }

  function arcs() {
    return calls.filter(function(call) { return call.op === 'arc'; });
  }

  // Where an arc begins and ends, in canvas coordinates.
  function arcStart(arc) {
    return { x: arc.x + arc.r * Math.cos(arc.start), y: arc.y + arc.r * Math.sin(arc.start) };
  }

  function arcEnd(arc) {
    return { x: arc.x + arc.r * Math.cos(arc.end), y: arc.y + arc.r * Math.sin(arc.end) };
  }

  it('replaces the element with a canvas of the requested size', function() {
    var element = render(200, 200);
    var canvas = element[0].querySelector('canvas');
    var ratio = window.devicePixelRatio || 1;

    expect(canvas).not.toBeNull();
    // Laid out at the requested CSS size...
    expect(canvas.style.width).toBe('200px');
    expect(canvas.style.height).toBe('200px');
    // ...but backed by enough device pixels to stay sharp.
    expect(canvas.width).toBe(200 * ratio);
    expect(canvas.height).toBe(200 * ratio);
  });

  it('scales the drawing to the device pixel ratio', function() {
    render(200, 200);
    var ratio = window.devicePixelRatio || 1;
    var transforms = calls.filter(function(call) { return call.op === 'setTransform'; });

    expect(transforms.length).toBe(1);
    expect(transforms[0].a).toBe(ratio);
    expect(transforms[0].d).toBe(ratio);

    // The transform must be applied before anything is drawn, since assigning
    // canvas.width resets it.
    expect(calls.indexOf(transforms[0])).toBeLessThan(
      calls.indexOf(calls.filter(function(c) { return c.op === 'fillRect'; })[0]));
  });

  it('gives the canvas an accessible role and name', function() {
    var element = render(200, 200);
    var canvas = element[0].querySelector('canvas');

    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toMatch(/Fibonacci spiral/);
  });

  it('keeps a caller-supplied aria-label', function() {
    var element = angular.element(
      '<div><div fibonacci width="200" height="200" aria-label="Custom description"></div></div>');
    compile(element)(outerScope);
    outerScope.$digest();

    expect(element[0].querySelector('canvas').getAttribute('aria-label'))
      .toBe('Custom description');
  });

  it('draws at least one tile', function() {
    render(200, 200);
    expect(rects().length).toBeGreaterThan(0);
  });

  it('draws only tiles with a positive area', function() {
    render(200, 200);
    rects().forEach(function(rect) {
      expect(rect.w).toBeGreaterThan(0);
      expect(rect.h).toBeGreaterThan(0);
    });
  });

  it('keeps every tile inside the canvas', function() {
    render(200, 200);
    rects().forEach(function(rect) {
      expect(rect.x).not.toBeLessThan(0);
      expect(rect.y).not.toBeLessThan(0);
      expect(rect.x + rect.w).not.toBeGreaterThan(200);
      expect(rect.y + rect.h).not.toBeGreaterThan(200);
    });
  });

  it('draws successively smaller tiles', function() {
    render(200, 200);
    var areas = rects().map(function(rect) { return rect.w * rect.h; });

    for (var i = 1; i < areas.length; i++) {
      expect(areas[i]).toBeLessThan(areas[i - 1]);
    }
  });

  // Extremes included deliberately: the tiling is only correct because the
  // rectangle being subdivided is golden, and a very wide or very tall canvas
  // is where a broken inscription would show up first.
  var ASPECTS = [[200, 200], [300, 150], [120, 400], [1000, 300], [120, 900]];

  function forEachAspect(assert) {
    ASPECTS.forEach(function(size) {
      calls = [];
      render(size[0], size[1]);
      assert(rects(), size);
    });
  }

  it('draws square tiles, whatever the canvas aspect ratio', function() {
    forEachAspect(function(tiles) {
      tiles.forEach(function(tile) {
        // A Fibonacci tiling removes a square at each step; anything else is
        // a nested-rectangle spiral, not a golden one.
        expect(Math.abs(tile.w - tile.h)).toBeLessThan(1e-9);
      });
    });
  });

  it('shrinks each tile from the last by exactly phi', function() {
    // Squareness alone does not make the figure golden: a run of squares
    // shrinking by any other constant would still pass that check. The ratio
    // between consecutive sides is what makes it a Fibonacci spiral.
    var PHI = (1 + Math.sqrt(5)) / 2;

    forEachAspect(function(tiles) {
      expect(tiles.length).toBeGreaterThan(1);

      for (var i = 1; i < tiles.length; i++) {
        expect(tiles[i - 1].w / tiles[i].w).toBeCloseTo(PHI, 9);
      }
    });
  });

  it('never overlaps two tiles', function() {
    // Each square is cut from the rectangle that remains, so the tiles
    // partition it. Overlap would mean a step consumed more than it removed.
    forEachAspect(function(tiles) {
      for (var i = 0; i < tiles.length; i++) {
        for (var j = i + 1; j < tiles.length; j++) {
          var a = tiles[i];
          var b = tiles[j];
          var overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          var overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

          // Touching edges are expected; overlapping interiors are not.
          expect(overlapX > 1e-9 && overlapY > 1e-9).toBe(false);
        }
      }
    });
  });

  it('tiles a golden rectangle', function() {
    // The precondition the whole algorithm rests on: subdividing anything but
    // a golden rectangle silently stops producing squares.
    var PHI = (1 + Math.sqrt(5)) / 2;

    forEachAspect(function(tiles) {
      var left = Math.min.apply(null, tiles.map(function(t) { return t.x; }));
      var right = Math.max.apply(null, tiles.map(function(t) { return t.x + t.w; }));
      var top = Math.min.apply(null, tiles.map(function(t) { return t.y; }));
      var bottom = Math.max.apply(null, tiles.map(function(t) { return t.y + t.h; }));

      var width = right - left;
      var height = bottom - top;
      var ratio = Math.max(width, height) / Math.min(width, height);

      expect(ratio).toBeCloseTo(PHI, 9);
    });
  });

  it('does not draw tiles too small to see', function() {
    render(200, 200);
    rects().forEach(function(rect) {
      expect(rect.w).not.toBeLessThan(1);
      expect(rect.h).not.toBeLessThan(1);
    });
  });

  it('scales detail with the canvas size', function() {
    // The old fixed count of four turns drew the same 16 tiles regardless of
    // size, so a large canvas lost detail and a small one drew invisibly.
    render(200, 200);
    var small = rects().length;

    calls = [];
    render(800, 800);
    var large = rects().length;

    expect(large).toBeGreaterThan(small);
  });

  it('caps the number of turns at the depth attribute', function() {
    var element = angular.element('<div><div fibonacci width="800" height="800" depth="2"></div></div>');
    compile(element)(outerScope);
    outerScope.$digest();

    expect(rects().length).toBe(8);
  });

  it('draws one quarter arc per square', function() {
    render(200, 200);
    expect(arcs().length).toBe(rects().length);

    arcs().forEach(function(arc) {
      expect(arc.end - arc.start).toBeCloseTo(Math.PI / 2, 10);
    });
  });

  it('joins the arcs into one continuous spiral', function() {
    render(200, 200);
    var drawn = arcs();

    for (var i = 1; i < drawn.length; i++) {
      var previous = arcEnd(drawn[i - 1]);
      var current = arcStart(drawn[i]);

      expect(current.x).toBeCloseTo(previous.x, 10);
      expect(current.y).toBeCloseTo(previous.y, 10);
    }
  });

  it('inscribes each arc in the square it belongs to', function() {
    render(200, 200);
    var squares = rects();

    arcs().forEach(function(arc, i) {
      // Radius equals the side of the square removed at that step.
      expect(arc.r).toBeCloseTo(Math.min(squares[i].w, squares[i].h), 10);
    });
  });

  it('strokes the spiral exactly once', function() {
    render(200, 200);
    var strokes = calls.filter(function(call) { return call.op === 'stroke'; });

    var ops = calls.map(function(call) { return call.op; });

    expect(strokes.length).toBe(1);
    // The canvas is cleared, then one path is opened, then it is stroked.
    expect(ops.indexOf('clearRect')).toBeLessThan(ops.indexOf('beginPath'));
    expect(ops.indexOf('beginPath')).toBeLessThan(ops.indexOf('stroke'));
  });

  it('redraws when the size changes', function() {
    var element = angular.element('<div><div fibonacci width="{{w}}" height="200"></div></div>');
    outerScope.w = 200;
    compile(element)(outerScope);
    outerScope.$digest();

    var first = rects().length;
    expect(first).toBeGreaterThan(0);

    calls = [];
    outerScope.w = 800;
    outerScope.$digest();

    // A fresh figure, cleared first rather than drawn over the old one.
    var ops = calls.map(function(call) { return call.op; });
    expect(ops.indexOf('clearRect')).toBeLessThan(ops.indexOf('fillRect'));
    expect(rects().length).not.toBe(first);
  });

  it('redraws when the depth changes', function() {
    var element = angular.element('<div><div fibonacci width="800" height="800" depth="{{d}}"></div></div>');
    outerScope.d = 1;
    compile(element)(outerScope);
    outerScope.$digest();

    expect(rects().length).toBe(4);

    calls = [];
    outerScope.d = 3;
    outerScope.$digest();

    expect(rects().length).toBe(12);
  });

  it('centres the figure on a canvas that is not golden', function() {
    render(400, 400);
    var drawn = rects();

    var left = Math.min.apply(null, drawn.map(function(r) { return r.x; }));
    var right = Math.max.apply(null, drawn.map(function(r) { return r.x + r.w; }));
    var top = Math.min.apply(null, drawn.map(function(r) { return r.y; }));
    var bottom = Math.max.apply(null, drawn.map(function(r) { return r.y + r.h; }));

    // Equal margins on opposing sides.
    expect(left).toBeCloseTo(400 - right, 6);
    expect(top).toBeCloseTo(400 - bottom, 6);
    // A square canvas leaves space above and below, and none at the sides:
    // the tiling fills the width, and the stroke is an overlay on top of it
    // rather than something the geometry makes room for.
    expect(left).toBeCloseTo(0, 6);
    expect(top).toBeGreaterThan(0);
  });

  it('fills the canvas rather than insetting for the stroke', function() {
    // The spiral is stroked over the finished tiling, so the tiles are not
    // shrunk to make room for it: the figure reaches the canvas edge on
    // whichever axis the inscribed golden rectangle is constrained by.
    forEachAspect(function(tiles, size) {
      var left = Math.min.apply(null, tiles.map(function(t) { return t.x; }));
      var top = Math.min.apply(null, tiles.map(function(t) { return t.y; }));
      var right = Math.max.apply(null, tiles.map(function(t) { return t.x + t.w; }));
      var bottom = Math.max.apply(null, tiles.map(function(t) { return t.y + t.h; }));

      var fillsWidth = left < 0.5 && right > size[0] - 0.5;
      var fillsHeight = top < 0.5 && bottom > size[1] - 0.5;

      expect(fillsWidth || fillsHeight).toBe(true);
    });
  });

  it('draws every tile in a colour from the palette', function() {
    var PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100',
                   '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

    render(400, 247);
    rects().forEach(function(rect) {
      expect(PALETTE.indexOf(rect.fillStyle)).not.toBeLessThan(0);
    });
  });

  it('never paints two neighbouring tiles the same colour', function() {
    // The point of the palette: adjacent tiles share an edge, so if they
    // share a colour the boundary between them disappears.
    render(400, 247);
    var drawn = rects();

    for (var i = 1; i < drawn.length; i++) {
      expect(drawn[i].fillStyle).not.toBe(drawn[i - 1].fillStyle);
    }
  });
});
