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
				var r = 0, g = 0, b = 0;
				var width = iElm[0].width;
				var height = iElm[0].height;
				var s = 0;
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
				function getColor(i) {
					if (i % 3 === 0) {
						r+=60, g=0, b=0;
					}
					if (i % 3 === 1) {
						r=0, g+=60, b=0;
					}
					if (i % 3 === 2) {
						r=0, g=0, b+=60;
					}
					return "rgb("+r+","+g+","+b+")";
				}
				for (var i=0; i<4; i++) {
					if (s % 4 === 0) {
						newWidth = INV_PHI * (xr - xl);
						ctx.fillStyle = getColor(i);
						ctx.fillRect(xl, yt, newWidth, yb - yt);
						xl = xl + newWidth;
					}
					s++;
					if (s % 4 === 1) {
						newHeight = INV_PHI * (yb - yt);
						ctx.fillStyle = getColor(i);
						ctx.fillRect(xl, yt, xr - xl, newHeight);
						yt = yt + newHeight;
					}
					s++;
					if (s % 4 === 2) {
						newWidth = INV_PHI * (xr - xl);
						ctx.fillStyle = getColor(i);
						ctx.fillRect(xr - newWidth, yt, newWidth, yb - yt);
						xr = xr - newWidth;
					}
					s++;
					if (s % 4 === 3) {
						newHeight = INV_PHI * (yb - yt);
						ctx.fillStyle = getColor(i);
						ctx.fillRect(xl, yb - newHeight, xr - xl, newHeight);
						yb = yb - newHeight;
					}
					s++;
				}
			}
		};
	});
