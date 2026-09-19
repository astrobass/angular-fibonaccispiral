# angular-fibonaccispiral

[![codecov](https://codecov.io/gh/astrobass/angular-fibonaccispiral/branch/master/graph/badge.svg)](https://codecov.io/gh/astrobass/angular-fibonaccispiral)

An AngularJS directive that draws a Fibonacci (golden) spiral on a `<canvas>`:
a tiling of squares whose sides follow the golden ratio, with a quarter arc
inscribed in each one.

> **Note:** AngularJS 1.x reached end of life in December 2021 and receives no
> further security patches. This directive targets AngularJS 1.x only.

## Usage

```html
<div fibonacci width="400" height="400"></div>
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

### Sizing

Squares only come out square when the rectangle being subdivided is itself a
golden rectangle, so the directive inscribes the largest golden rectangle that
fits the canvas and draws into that. A canvas whose own aspect ratio is close
to 1.618:1 therefore leaves the least unused space.

## Development

```
npm install
npm test
```

Karma runs the suite in headless Chrome. Set `CHROME_BIN` if Chrome is not on
the default path. `test/test.html` runs the same specs in a real browser.

## To run in Docker on port 8080

Build the repository
```
docker build -t angular-fibonaccispiral git@github.com:astrobass/angular-fibonaccispiral.git
```

Run the web server
```
docker run -d -p 8080:80 --name fibonaccispiral angular-fibonaccispiral
```
