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

    expect(canvas).not.toBeNull();
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(200);
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

  it('draws square tiles, whatever the canvas aspect ratio', function() {
    [[200, 200], [300, 150], [120, 400]].forEach(function(size) {
      calls = [];
      render(size[0], size[1]);

      rects().forEach(function(rect) {
        // A Fibonacci tiling removes a square at each step; anything else is
        // a nested-rectangle spiral, not a golden one.
        expect(Math.abs(rect.w - rect.h)).toBeLessThan(0.0001);
      });
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

    expect(strokes.length).toBe(1);
    expect(calls[0].op).toBe('clearRect');
    expect(calls[1].op).toBe('beginPath');
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
    expect(calls[0].op).toBe('clearRect');
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
    // A square canvas leaves space above and below; at the sides only the
    // inset that keeps the spiral stroke inside the canvas.
    expect(left).toBeCloseTo(1, 6);
    expect(top).toBeGreaterThan(1);
  });

  it('leaves room for the spiral stroke at the canvas edge', function() {
    // The stroke is centred on the path, so half its width falls outside the
    // tiling. Without an inset the outermost arc is clipped by the canvas.
    var HALF_STROKE = 1;

    [[400, 400], [400, 247]].forEach(function(size) {
      calls = [];
      render(size[0], size[1]);

      rects().forEach(function(rect) {
        expect(rect.x).not.toBeLessThan(HALF_STROKE);
        expect(rect.y).not.toBeLessThan(HALF_STROKE);
        expect(rect.x + rect.w).not.toBeGreaterThan(size[0] - HALF_STROKE);
        expect(rect.y + rect.h).not.toBeGreaterThan(size[1] - HALF_STROKE);
      });
    });
  });

  it('keeps the whole stroke width inside the canvas', function() {
    // The rect check above covers the tiles; the arcs reach the tile
    // boundaries, so check them explicitly. Each arc spans exactly one
    // quadrant, where cos and sin are both monotonic, so its extremes are its
    // two endpoints -- not the full circle's bounding box. A stroke is centred
    // on its path, so the endpoints plus half the stroke must still fit.
    var HALF_STROKE = 1;
    var EPSILON = 1e-9;

    [[400, 400], [400, 247], [200, 200]].forEach(function(size) {
      calls = [];
      render(size[0], size[1]);

      arcs().forEach(function(arc) {
        [arcStart(arc), arcEnd(arc)].forEach(function(point) {
          expect(point.x - HALF_STROKE).not.toBeLessThan(-EPSILON);
          expect(point.y - HALF_STROKE).not.toBeLessThan(-EPSILON);
          expect(point.x + HALF_STROKE).not.toBeGreaterThan(size[0] + EPSILON);
          expect(point.y + HALF_STROKE).not.toBeGreaterThan(size[1] + EPSILON);
        });
      });
    });
  });

  it('uses colour channels that are within range', function() {
    render(200, 200);
    rects().forEach(function(rect) {
      var channels = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(rect.fillStyle);

      expect(channels).not.toBeNull();
      for (var i = 1; i <= 3; i++) {
        expect(Number(channels[i])).not.toBeGreaterThan(255);
      }
    });
  });
});
