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
 *   @option {String} host        - Stackdriver API base hostname, which defaults to
 *                                  https://custom-gateway.stackdriver.com/v1/custom
 *   @param  {String} instance    - Instance ID to pass along to Stackdriver
 */

function Client(apiKey, instance){
  if (!(this instanceof Client)) return new Client(apiKey, instance);
  if (!is.string(apiKey) || is.empty(apiKey)) {
    throw new Error('apiKey must be a non-empty string');
  }
  debug('using apiKey: %s, instance: %s', apiKey, instance);
  this.apiKey = apiKey;
  this.instance = instance;
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

Client.prototype.send = function(name, value, timestamp, fn){
  if (typeof timestamp === 'function') {
    fn = timestamp;
    timestamp = undefined;
  }

  if (!is.string(name) || is.empty(name)) throw new Error('name must be a string');
  if (!is.number(value)) throw new Error('value must be a number');
  if (!timestamp) timestamp = new Date();
  if (!is.date(timestamp)) throw new Error('timestamp must be a date');

  var metric = {
    name: name,
    instance: this.instance,
    value: value,
    collected_at: unixTime(timestamp)
  };

  var body = {
    timestamp: unixTime(new Date()),
    proto_version: 1,
    data: metric
  };

  debug('sending metric: %j', metric);
  fn = fn || function(){};
  // http://feedback.stackdriver.com/knowledgebase/articles/181488-sending-custom-metrics-to-the-stackdriver-system
  request
    .post('https://custom-gateway.stackdriver.com/v1/custom')
    .send(body)
    .set('x-stackdriver-apikey', this.apiKey)
    .end(function (err, res) {
      if (err) return fn(err);
      if (!res.ok) err = new Error(res.text);
      fn(err, res);
    });

  return this;
};