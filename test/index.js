var stackdriver = require('../');
var conf = require('./conf.json');

describe('stackdriver-custom', function () {
  var client = stackdriver(conf.apiKey, conf.instance);
  it('should send a custom metric', function (done) {
    client.send('a custom metric', 1, done);
  });
});