# angular-fibonaccispiral

An AngularJS directive that draws a Fibonacci (golden) spiral on a `<canvas>`:
a tiling of squares whose sides follow the golden ratio, with a quarter arc
inscribed in each one.

> **Note:** AngularJS 1.x reached end of life in December 2021 and receives no
> further security patches. This directive targets AngularJS 1.x only.

## Install

```
npm install angular-fibonaccispiral
```

AngularJS is a **peer** dependency: the host application provides it, this
package does not install its own copy.

```
npm install angular@^1.8.3
```

## Usage

```html
<div fibonacci width="400" height="247"></div>
```

```js
angular.module('myApp', ['fibonacci']);
```

### Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `width` | canvas default (300) | Canvas width in pixels. |
| `height` | canvas default (150) | Canvas height in pixels. |
| `depth` | unbounded | Maximum number of turns. Each turn draws four squares. Unset draws every turn whose squares are still at least a pixel across. |

All three are observed, so the figure is redrawn if they change.

### Zooming

The figure zooms without limit: **scroll**, **pinch**, or focus it and press
**+** / **-**. The canvas is keyboard-reachable, so the zoom is not
mouse-only.

Zooming descends into the spiral rather than magnifying it -- tiles too small
to draw at one level become visible at the next, and the point the squares
converge on stays pinned on screen.

It really is unbounded. Removing four squares reproduces the tiling scaled by
`1/phi^4` about that convergence point, and the palette repeats every eight, so
the image at any zoom `z` and at `z * phi^8` is identical. The zoom is reduced
into that one period before drawing, which means the coordinates never leave a
range doubles represent exactly and the work stays constant -- around 12 to 19
tiles per frame at any depth. A naive implementation that kept subdividing
would lose precision somewhere past a zoom of `10^15`; this one is still exact
at `10^30`.

### Sizing

Squares only come out square when the rectangle being subdivided is itself a
golden rectangle, so the directive inscribes the largest golden rectangle that
fits the canvas and draws into that, centred.

A canvas that is not itself golden therefore has space left over: a 400x400
canvas is filled 400x247, with the remainder split evenly above and below. Size
the canvas to roughly 1.618:1 to use all of it -- `width="400" height="247"`.

## Development

```
npm ci
npm run lint
npm test
```

Karma runs the suite in headless Chrome. Set `CHROME_BIN` if Chrome is not on
the default path. `test/test.html` runs the same specs in a real browser; CI
does not load it, so `npm run check:test-page` verifies its assets resolve and
that it still loads the shared spec file rather than an inline copy.

Karma also writes an lcov report to `coverage/`. It is not uploaded anywhere;
open `coverage/*/lcov-report/index.html` to read it locally.

## GitHub Pages

The demo at https://astrobass.github.io/angular-fibonaccispiral/ is published
by `.github/workflows/pages.yml` on every push to `master`, which rebuilds the
`gh-pages` branch from `app/`. Do not edit `gh-pages` by hand: it is a build
output, and hand edits are overwritten by the next deploy.

Only `index.html` and `fibSpiral.js` are published. The specs are deliberately
left out.

## To run in Docker on port 8080

Build the repository
```
docker build -t angular-fibonaccispiral git@github.com:astrobass/angular-fibonaccispiral.git
```

Run the web server
```
docker run -d -p 8080:80 --name fibonaccispiral angular-fibonaccispiral
```
