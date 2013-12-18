var stackdriver = require('../');
var conf = require('./conf.json');


describe('stackdriver-custom', function () {
  var client = stackdriver(conf);
  it('should send a custom metric', function (done) {
    client.send('custom test metric', 1, done);
  });
});