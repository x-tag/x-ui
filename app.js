var static = require('node-static');

var fileServer = new static.Server('./ui/');

var port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
console.log("x-ui listening on port:", port);

require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        fileServer.serve(request, response);
    });
}).listen(port);