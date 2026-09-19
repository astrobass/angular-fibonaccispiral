angular.module('fibonacci',[])
	.directive('fibonacci', function() {
		// Runs during compile
		return {
			name: 'fibonacci',
			scope: {},
			restrict: 'A', // E = Element, A = Attribute, C = Class, M = Comment
			template: '<canvas></canvas>',
			replace: true,
			link: function($scope, iElm, iAttrs, controller) {
				// 1/phi. Removing a square from a golden rectangle leaves this
				// fraction of the long side, and the remainder is golden again.
				var INV_PHI = 2 / (1 + Math.sqrt(5));
				var width = iElm[0].width;
				var height = iElm[0].height;
				// That recursion only holds if the rectangle is already golden, so
				// subdivide the largest golden rectangle that fits the canvas
				// rather than the canvas itself.
				var rectWidth, rectHeight;
				if (width / height >= 1 / INV_PHI) {
					rectHeight = height;
					rectWidth = height / INV_PHI;
				} else {
					rectWidth = width;
					rectHeight = width * INV_PHI;
				}
				var xl = 0, xr = rectWidth, yt = 0, yb = rectHeight;
				var newWidth = rectWidth, newHeight = rectHeight;
				var ctx = iElm[0].getContext('2d');
				// Squares below a pixel render as nothing, so the loop is bounded by
				// canvas size rather than by a hardcoded iteration count. The
				// optional `depth` attribute caps the number of turns on top of that.
				var MIN_TILE = 1;
				var maxTurns = parseInt(iAttrs.depth, 10);
				if (!(maxTurns > 0)) {
					maxTurns = Infinity;
				}
				// Each turn of the spiral picks a channel; each of its four squares
				// is a step brighter. Pure, so the caller's iteration order is the
				// only thing that decides the palette.
				function getColor(turn, step) {
					var rgb = [0, 0, 0];
					rgb[turn % 3] = Math.min(255, (step + 1) * 60);
					return "rgb(" + rgb.join(",") + ")";
				}
				for (var i = 0; i < maxTurns; i++) {
					// Remove a square from the left edge, then the top, then the
					// right, then the bottom -- one full turn of the spiral. Each
					// square is 1/phi of the side it is taken from, so they shrink
					// fast; stop as soon as one would be too small to see.
					newWidth = INV_PHI * (xr - xl);
					if (newWidth < MIN_TILE) { break; }
					ctx.fillStyle = getColor(i, 0);
					ctx.fillRect(xl, yt, newWidth, yb - yt);
					xl = xl + newWidth;

					newHeight = INV_PHI * (yb - yt);
					if (newHeight < MIN_TILE) { break; }
					ctx.fillStyle = getColor(i, 1);
					ctx.fillRect(xl, yt, xr - xl, newHeight);
					yt = yt + newHeight;

					newWidth = INV_PHI * (xr - xl);
					if (newWidth < MIN_TILE) { break; }
					ctx.fillStyle = getColor(i, 2);
					ctx.fillRect(xr - newWidth, yt, newWidth, yb - yt);
					xr = xr - newWidth;

					newHeight = INV_PHI * (yb - yt);
					if (newHeight < MIN_TILE) { break; }
					ctx.fillStyle = getColor(i, 3);
					ctx.fillRect(xl, yb - newHeight, xr - xl, newHeight);
					yb = yb - newHeight;
				}
			}
		};
	});
