(function() {
	'use strict';

	// 1/phi. Removing a square from a golden rectangle leaves this fraction of
	// the long side, and the remainder is golden again.
	var INV_PHI = 2 / (1 + Math.sqrt(5));
	var QUARTER = Math.PI / 2;
	// Squares below a pixel render as nothing, so the loop is bounded by canvas
	// size rather than by a hardcoded iteration count.
	var MIN_TILE = 1;
	// An unsized <canvas> is 300x150 per the HTML spec.
	var DEFAULT_WIDTH = 300;
	var DEFAULT_HEIGHT = 150;
	// A canvas has no text of its own, so assistive technology announces
	// nothing unless it is given a role and a name.
	var LABEL = 'A Fibonacci spiral: nested golden-ratio squares, each with a quarter arc inscribed. ' +
		'Scroll, pinch, or press plus and minus to zoom in without limit.';
	// How far one wheel notch, or one press of + or -, moves the zoom. At 1.5
	// a full self-similar period (phi^8, about 47x) is nine notches away;
	// stepping by a few percent made descending the spiral a chore.
	var ZOOM_STEP = 1.5;
	// How much wheel travel makes up one step. A mouse notch is ~100px, but a
	// trackpad reports a scroll as a stream of much smaller deltas, so a
	// shorter notch keeps a deliberate two-finger scroll from crawling.
	var WHEEL_NOTCH = 60;
	// A trackpad pinch is not a touch gesture: it arrives as a wheel event
	// with ctrlKey set and deltas smaller still. A whole pinch accumulates
	// only a couple of hundred pixels, so it needs its own, much shorter
	// notch or the gesture barely registers.
	var PINCH_NOTCH = 25;
	var LINE_HEIGHT = 16;
	var PAGE_HEIGHT = 800;
	// The spiral is an overlay stroked on top of the finished tiling, so its
	// width does not enter the geometry: the tiles fill the canvas and the
	// line is drawn over them. One CSS pixel is the thinnest the curve reads
	// as a drawn line; below a device pixel a stroke stops getting thinner
	// and only gets fainter.
	var LINE_WIDTH = 1;
	// Removing four squares reproduces the tiling scaled by phi^-4 about the
	// point the nested rectangles converge on, and the palette repeats every
	// eight. So zooming in by phi^8 lands on a pixel-identical image, and the
	// zoom can be reduced into one period before drawing: the viewer descends
	// forever while the renderer never leaves a range doubles can represent.
	var PHI = 1 / INV_PHI;
	var ZOOM_PERIOD = Math.pow(PHI, 8);
	// Where the subdivision converges, as a fraction along both sides of the
	// golden rectangle. Iterating the subdivision agrees with this to 1e-12.
	var EYE = (1 + 1 / Math.sqrt(5)) / 2;

	// A validated categorical order: every adjacent pair clears the
	// colour-vision-deficiency and normal-vision separation gates (worst
	// adjacent dE 9.1 CVD, 19.6 normal, OKLab x100). The previous scheme
	// picked one channel per turn and stepped it by 60, so the four tiles of
	// a turn were four shades of the same hue and barely told apart.
	var PALETTE = [
		'#2a78d6', // blue
		'#eb6834', // orange
		'#1baf7a', // aqua
		'#eda100', // yellow
		'#e87ba4', // magenta
		'#008300', // green
		'#4a3aa7', // violet
		'#e34948'  // red
	];

	// Tiles are an ordered geometric sequence rather than data series with
	// identities to confuse, so the order repeats past eight instead of
	// folding into an "other" bucket. By then each tile is a few pixels wide.
	function getColor(turn, step) {
		return PALETTE[(turn * 4 + step) % PALETTE.length];
	}

	// The largest golden rectangle that fits width x height. The 1/phi
	// subdivision only yields squares if the rectangle is already golden, so
	// this is what gets subdivided -- not the canvas itself.
	function goldenRect(width, height) {
		if (width / height >= 1 / INV_PHI) {
			return { width: height / INV_PHI, height: height };
		}
		return { width: width, height: width * INV_PHI };
	}

	// Reduce a zoom factor into [1, phi^8). The image at `zoom` and at
	// `zoom * phi^8` is identical, so this is exact, not an approximation.
	function wrapZoom(zoom) {
		while (zoom >= ZOOM_PERIOD) { zoom /= ZOOM_PERIOD; }
		while (zoom < 1) { zoom *= ZOOM_PERIOD; }
		return zoom;
	}

	function draw(ctx, width, height, maxTurns, ratio, zoom) {
		var rect = goldenRect(width, height);
		// The tiling only fills a golden rectangle, so on a canvas of any other
		// aspect ratio there is space left over. Centre the figure in it rather
		// than pinning it to the top-left corner.
		var offsetX = (width - rect.width) / 2;
		var offsetY = (height - rect.height) / 2;
		var xl = offsetX, xr = offsetX + rect.width;
		var yt = offsetY, yb = offsetY + rect.height;
		var newWidth, newHeight;
		// The spiral is one continuous path of quarter arcs, each inscribed in
		// the square just removed. Every arc starts where the previous one
		// ended, so the sweep advances a quarter turn per square, beginning at
		// PI (the left edge). fillRect does not disturb the current path, so
		// the arcs can accumulate while the squares are being filled.
		var angle = Math.PI;
		// The point everything converges on, and the anchor the zoom pivots
		// about, so it stays put on screen however far in the viewer goes.
		var eyeX = offsetX + rect.width * EYE;
		var eyeY = offsetY + rect.height * EYE;
		// A tile is worth drawing while it still covers a pixel once scaled;
		// the cutoff therefore moves with the zoom, which is what makes
		// detail keep appearing rather than the figure merely getting bigger.
		var minTile = MIN_TILE / zoom;

		// Device pixels and zoom in one transform: scale about the eye, then
		// scale again for the display. Tiles larger than the canvas are simply
		// clipped, so the loop can always start from the first one.
		ctx.setTransform(
			ratio * zoom, 0,
			0, ratio * zoom,
			ratio * eyeX * (1 - zoom),
			ratio * eyeY * (1 - zoom)
		);
		// clearRect honours the transform, so clear in the space the figure is
		// drawn in -- the canvas mapped back through the zoom.
		ctx.clearRect(
			eyeX - (eyeX / zoom) - width, eyeY - (eyeY / zoom) - height,
			(width + eyeX) * 2 / zoom + width * 2, (height + eyeY) * 2 / zoom + height * 2
		);
		ctx.beginPath();

		for (var i = 0; i < maxTurns; i++) {
			// Remove a square from the left edge, then the top, then the right,
			// then the bottom -- one full turn of the spiral. Each square is
			// 1/phi of the side it is taken from, so they shrink fast; stop as
			// soon as one would be too small to see.
			newWidth = INV_PHI * (xr - xl);
			if (newWidth < minTile) { break; }
			ctx.fillStyle = getColor(i, 0);
			ctx.fillRect(xl, yt, newWidth, yb - yt);
			xl = xl + newWidth;
			ctx.arc(xl, yb, newWidth, angle, angle + QUARTER);
			angle += QUARTER;

			newHeight = INV_PHI * (yb - yt);
			if (newHeight < minTile) { break; }
			ctx.fillStyle = getColor(i, 1);
			ctx.fillRect(xl, yt, xr - xl, newHeight);
			yt = yt + newHeight;
			ctx.arc(xl, yt, newHeight, angle, angle + QUARTER);
			angle += QUARTER;

			newWidth = INV_PHI * (xr - xl);
			if (newWidth < minTile) { break; }
			ctx.fillStyle = getColor(i, 2);
			ctx.fillRect(xr - newWidth, yt, newWidth, yb - yt);
			xr = xr - newWidth;
			ctx.arc(xr, yt, newWidth, angle, angle + QUARTER);
			angle += QUARTER;

			newHeight = INV_PHI * (yb - yt);
			if (newHeight < minTile) { break; }
			ctx.fillStyle = getColor(i, 3);
			ctx.fillRect(xl, yb - newHeight, xr - xl, newHeight);
			yb = yb - newHeight;
			ctx.arc(xr, yb, newHeight, angle, angle + QUARTER);
			angle += QUARTER;
		}

		ctx.strokeStyle = 'rgb(255,255,255)';
		// lineWidth is in user space, which the transform scales, so divide it
		// back out to keep the overlay one CSS pixel at every zoom.
		ctx.lineWidth = LINE_WIDTH / zoom;
		ctx.stroke();
	}

	angular.module('fibonacci', [])
		.directive('fibonacci', function() {
			return {
				scope: {},
				restrict: 'A', // E = Element, A = Attribute, C = Class, M = Comment
				template: '<canvas role="img"></canvas>',
				replace: true,
				link: function($scope, iElm, iAttrs) {
					var canvas = iElm[0];
					var ctx = canvas.getContext && canvas.getContext('2d');

					if (!ctx) {
						// No 2d canvas support, or the template was overridden
						// with something that is not a canvas.
						return;
					}

					// A caller-supplied label wins; replace: true has already
					// merged any aria-label from the source element by now.
					if (!canvas.getAttribute('aria-label')) {
						canvas.setAttribute('aria-label', LABEL);
					}

					// The size the figure is drawn in, in CSS pixels. Read from
					// the attributes rather than from canvas.width, which after
					// the first render holds device pixels instead.
					function logicalSize() {
						var width = parseFloat(iAttrs.width);
						var height = parseFloat(iAttrs.height);

						return {
							width: width > 0 ? width : DEFAULT_WIDTH,
							height: height > 0 ? height : DEFAULT_HEIGHT
						};
					}

					var zoom = 1;
					var frame = null;

					function render() {
						frame = null;

						// The `depth` attribute caps the number of turns on top
						// of the pixel-size bound; unset means draw all visible
						// turns.
						var maxTurns = parseInt(iAttrs.depth, 10);
						if (!(maxTurns > 0)) {
							maxTurns = Infinity;
						}

						var size = logicalSize();
						// A canvas is laid out in CSS pixels but draws into a
						// backing store sized in device pixels. Sizing that
						// store to the CSS size leaves the browser to upscale
						// it, which is what made the figure blurry on any
						// high-DPI display.
						var ratio = window.devicePixelRatio || 1;

						canvas.width = size.width * ratio;
						canvas.height = size.height * ratio;
						canvas.style.width = size.width + 'px';
						canvas.style.height = size.height + 'px';

						draw(ctx, size.width, size.height, maxTurns, ratio, zoom);
					}

					// Coalesce the redraws a gesture produces into one per
					// frame; a wheel can fire far faster than the display.
					function scheduleRender() {
						if (frame === null) {
							frame = window.requestAnimationFrame(render);
						}
					}

					function zoomBy(factor) {
						zoom = wrapZoom(zoom * factor);
						scheduleRender();
					}

					// deltaY means pixels, lines or pages depending on the
					// device and browser; convert to pixels so the same
					// gesture zooms the same amount everywhere.
					function wheelPixels(event) {
						if (event.deltaMode === 1) {
							return event.deltaY * LINE_HEIGHT;
						}
						if (event.deltaMode === 2) {
							return event.deltaY * PAGE_HEIGHT;
						}
						return event.deltaY;
					}

					iElm.on('wheel', function(event) {
						event.preventDefault();
						// ctrlKey on a wheel event means a pinch, not a scroll
						// with a modifier held -- browsers report trackpad and
						// touchscreen pinch-zoom this way.
						var notch = event.ctrlKey ? PINCH_NOTCH : WHEEL_NOTCH;
						zoomBy(Math.pow(ZOOM_STEP, -wheelPixels(event) / notch));
					});

					canvas.setAttribute('tabindex', '0');
					iElm.on('keydown', function(event) {
						if (event.key === '+' || event.key === '=') {
							event.preventDefault();
							zoomBy(ZOOM_STEP);
						} else if (event.key === '-' || event.key === '_') {
							event.preventDefault();
							zoomBy(1 / ZOOM_STEP);
						}
					});

					// Pinch. touch-action is set so the browser does not claim
					// the gesture for page zoom before it reaches us.
					canvas.style.touchAction = 'none';
					var pinch = 0;

					function spread(touches) {
						var dx = touches[0].clientX - touches[1].clientX;
						var dy = touches[0].clientY - touches[1].clientY;
						return Math.sqrt(dx * dx + dy * dy);
					}

					iElm.on('touchstart', function(event) {
						if (event.touches.length === 2) {
							pinch = spread(event.touches);
						}
					});

					iElm.on('touchmove', function(event) {
						if (event.touches.length !== 2 || pinch === 0) {
							return;
						}
						event.preventDefault();
						var now = spread(event.touches);
						if (now > 0) {
							zoomBy(now / pinch);
							pinch = now;
						}
					});

					iElm.on('touchend', function() {
						pinch = 0;
					});

					$scope.$on('$destroy', function() {
						if (frame !== null) {
							window.cancelAnimationFrame(frame);
						}
					});

					// Redraw when the inputs change. $watchGroup fires once up
					// front and once per change, where three separate $observe
					// calls would each fire their own initial pass and draw the
					// figure four times over.
					$scope.$watchGroup([
						function() { return iAttrs.width; },
						function() { return iAttrs.height; },
						function() { return iAttrs.depth; }
					], render);
				}
			};
		});
}());
