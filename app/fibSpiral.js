(function() {
	'use strict';

	// 1/phi. Removing a square from a golden rectangle leaves this fraction of
	// the long side, and the remainder is golden again.
	var INV_PHI = 2 / (1 + Math.sqrt(5));
	var QUARTER = Math.PI / 2;
	// Squares below a pixel render as nothing, so the loop is bounded by canvas
	// size rather than by a hardcoded iteration count.
	var MIN_TILE = 1;

	// Each turn of the spiral picks a channel; each of its four squares is a
	// step brighter. Pure, so the caller's iteration order is the only thing
	// that decides the palette.
	function getColor(turn, step) {
		var rgb = [0, 0, 0];
		rgb[turn % 3] = Math.min(255, (step + 1) * 60);
		return 'rgb(' + rgb.join(',') + ')';
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
		ctx.lineWidth = 2;
		ctx.stroke();
	}

	angular.module('fibonacci', [])
		.directive('fibonacci', function() {
			return {
				scope: {},
				restrict: 'A', // E = Element, A = Attribute, C = Class, M = Comment
				template: '<canvas></canvas>',
				replace: true,
				link: function($scope, iElm, iAttrs) {
					var canvas = iElm[0];
					var ctx = canvas.getContext && canvas.getContext('2d');

					if (!ctx) {
						// No 2d canvas support, or the template was overridden
						// with something that is not a canvas.
						return;
					}

					function render() {
						// The `depth` attribute caps the number of turns on top
						// of the pixel-size bound; unset means draw all visible
						// turns.
						var maxTurns = parseInt(iAttrs.depth, 10);
						if (!(maxTurns > 0)) {
							maxTurns = Infinity;
						}

						draw(ctx, canvas.width, canvas.height, maxTurns);
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
