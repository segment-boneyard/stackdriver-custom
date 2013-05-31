var Stackdriver = require('./index.js');

var client = new Stackdriver({
    apiKey     : 'x',
    customerId : 1
});

client.sendMetric('test metric a123', 123);