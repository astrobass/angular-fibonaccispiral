# ng-fibonaccispiral

[![Stories in Ready](https://badge.waffle.io/astrobass/ng-fibonaccispiral.png?label=ready&title=Ready)](http://waffle.io/astrobass/ng-fibonaccispiral) [![codecov](https://codecov.io/gh/astrobass/angular-fibonaccispiral/branch/master/graph/badge.svg)](https://codecov.io/gh/astrobass/angular-fibonaccispiral)

## To run in Docker on port 8080

Build the repository
```
docker build -t angular-fibonaccispiral git@github.com:astrobass/angular-fibonaccispiral.git
```

Run the web server
```
docker run -d -p 8080:80 --name fibonaccispiral angular-fibonaccispiral
```
