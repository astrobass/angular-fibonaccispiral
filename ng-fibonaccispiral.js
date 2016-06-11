angular.module('fibonacci',[])
	.directive('fibonacci', function() {
		// Runs during compile
		return {
			name: 'fibonacci',
			scope: {},
			restrict: 'A', // E = Element, A = Attribute, C = Class, M = Comment
			template: '<canvas width="1215" height="750"></canvas>',
			replace: true,
			link: function($scope, iElm, iAttrs, controller) {
				var r = 0, g = 0, b = 0;
				var width = iElm[0].width;
				var height = iElm[0].height;
				var s = 0;
				var xl = 0, xr = width, yt = 0, yb = height;
				var newWidth = width, newHeight = height;
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
						newWidth = 0.618 * (xr - xl);
						ctx.fillStyle = getColor(i);
						ctx.fillRect(xl, yt, newWidth, yb - yt);
						xl = xl + newWidth;
					}
					s++;
					if (s % 4 === 1) {
						newHeight = 0.618 * (yb - yt);
						ctx.fillStyle = getColor(i);
						ctx.fillRect(xl, yt, xr - xl, newHeight);
						yt = yt + newHeight;
					}
					s++;
					if (s % 4 === 2) {
						newWidth = 0.618 * (xr - xl);
						ctx.fillStyle = getColor(i);
						ctx.fillRect(xr - newWidth, yt, newWidth, yb - yt);
						xr = xr - newWidth;
					}
					s++;
					if (s % 4 === 3) {
						newHeight = 0.618 * (yb - yt);
						ctx.fillStyle = getColor(i);
						ctx.fillRect(xl, yb - newHeight, xr - xl, newHeight);
						yb = yb - newHeight;
					}
					s++;
				}
			}
		};
	});