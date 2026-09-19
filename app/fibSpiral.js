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
	var LABEL = 'A Fibonacci spiral: nested golden-ratio squares, each with a quarter arc inscribed.';
	// The spiral is an overlay stroked on top of the finished tiling, so its
	// width does not enter the geometry: the tiles fill the canvas and the
	// line is drawn over them. One CSS pixel is the thinnest the curve reads
	// as a drawn line; below a device pixel a stroke stops getting thinner
	// and only gets fainter.
	var LINE_WIDTH = 1;

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

	function draw(ctx, width, height, maxTurns) {
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

		ctx.clearRect(0, 0, width, height);
		ctx.beginPath();

		for (var i = 0; i < maxTurns; i++) {
			// Remove a square from the left edge, then the top, then the right,
			// then the bottom -- one full turn of the spiral. Each square is
			// 1/phi of the side it is taken from, so they shrink fast; stop as
			// soon as one would be too small to see.
			newWidth = INV_PHI * (xr - xl);
			if (newWidth < MIN_TILE) { break; }
			ctx.fillStyle = getColor(i, 0);
			ctx.fillRect(xl, yt, newWidth, yb - yt);
			xl = xl + newWidth;
			ctx.arc(xl, yb, newWidth, angle, angle + QUARTER);
			angle += QUARTER;

			newHeight = INV_PHI * (yb - yt);
			if (newHeight < MIN_TILE) { break; }
			ctx.fillStyle = getColor(i, 1);
			ctx.fillRect(xl, yt, xr - xl, newHeight);
			yt = yt + newHeight;
			ctx.arc(xl, yt, newHeight, angle, angle + QUARTER);
			angle += QUARTER;

			newWidth = INV_PHI * (xr - xl);
			if (newWidth < MIN_TILE) { break; }
			ctx.fillStyle = getColor(i, 2);
			ctx.fillRect(xr - newWidth, yt, newWidth, yb - yt);
			xr = xr - newWidth;
			ctx.arc(xr, yt, newWidth, angle, angle + QUARTER);
			angle += QUARTER;

			newHeight = INV_PHI * (yb - yt);
			if (newHeight < MIN_TILE) { break; }
			ctx.fillStyle = getColor(i, 3);
			ctx.fillRect(xl, yb - newHeight, xr - xl, newHeight);
			yb = yb - newHeight;
			ctx.arc(xr, yb, newHeight, angle, angle + QUARTER);
			angle += QUARTER;
		}

		ctx.strokeStyle = 'rgb(255,255,255)';
		ctx.lineWidth = LINE_WIDTH;
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

					function render() {
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

						// Assigning width or height resets the context, its
						// transform included, so this must follow. Every
						// coordinate below is then in CSS pixels.
						ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

						draw(ctx, size.width, size.height, maxTurns);
					}

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
