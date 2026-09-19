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
      fillRect: function(x, y, w, h) {
        calls.push({ op: 'fillRect', x: x, y: y, w: w, h: h, fillStyle: ctx.fillStyle });
      }
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
