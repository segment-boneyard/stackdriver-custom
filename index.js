var debug = require('debug')('stackdriver-custom');
var defaults = require('defaults');
var is = require('is');
var request = require('superagent');
var unixTime = require('unix-time');

/**
 * module `exports`
 */

module.exports = Client;


/**
 * Stackdriver node client driver
 * http://feedback.stackdriver.com/knowledgebase/articles/181488-sending-custom-metrics-to-the-stackdriver-system
 *
 * @param  {Object} options
 *   @param  {String} apiKey      - Stackdriver API key from your Stackdriver Account Settings at
 *                                  https://app.stackdriver.com/settings/apikey/add
 *   @param  {String} customerId  - Stackdriver Customer Id
 *   @option {String} host        - Stackdriver API base hostname, which defaults to
 *                                  https://custom-gateway.stackdriver.com/v1/custom
 *   @param  {String} instance    - Instance ID to pass along to Stackdriver
 *   @param  {String} prefix      - prefix for every metric
 */

function Client (options) {
  if (!(this instanceof Client)) return new Client(options);
  options = defaults(options || {}, {
    host: 'https://custom-gateway.stackdriver.com/v1/custom',
    instance: null,
    prefix: null
  });

  var apiKey = options.apiKey;
  var customerId = options.customerId;

  if (!is.string(apiKey) || is.empty(apiKey)) {
    throw new Error('apiKey must be a non-empty string');
  }
  if (!is.number(customerId) || customerId < 0) {
    throw new Error('customerId must be a valid number');
  }

  debug('using options: %j', options);
  this.options = options;
}


/**
 * Identifying a user ties all of their actions to an ID, and associates
 * user `traits` to that ID.
 *
 *
 * @param  {String} name         - the name of your metric
 * @param  {Number} value        - the value of your metric
 * @param  {Date}   timestamp - the time you collected this value for the metric
 *
 */

Client.prototype.send = function (name, value, timestamp, callback) {
  if (typeof timestamp === 'function') {
    callback = timestamp;
    timestamp = undefined;
  }

  if (!is.string(name) || is.empty(name)) throw new Error('name must be a string');
  if (!is.number(value)) throw new Error('value must be a number');
  if (!timestamp) timestamp = new Date();
  if (!is.date(timestamp)) throw new Error('timestamp must be a date');

  var options = this.options;
  var metric = {
    name: name,
    instance: options.instance,
    value: value,
    collected_at: unixTime(timestamp)
  };

  var body = {
    timestamp: unixTime(new Date()),
    proto_version: 1,
    customer_id: options.customerId,
    data: metric
  };

  debug('sending metric: %j', metric);
  // http://feedback.stackdriver.com/knowledgebase/articles/181488-sending-custom-metrics-to-the-stackdriver-system
  request
    .post(options.host)
    .send(body)
    .set('x-stackdriver-apikey', options.apiKey)
    .end(function (err, body) {
      var valid = body.status === 200 || body.status === 201;
      if (!valid) err = new Error(body.text);
      callback && callback(err, body);
    });
};