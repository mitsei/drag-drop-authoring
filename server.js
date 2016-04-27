var fs = require('fs');
var express = require('express');

var app = express();
app.listen(8090, function () {
  console.log('Listening on port 8090!');
});

app.use(express.static(__dirname + '/app'));
