var _       = require('underscore'),
    request = require('request');


/**
 *  Stackdriver node client driver
 * http://feedback.stackdriver.com/knowledgebase/articles/181488-sending-custom-metrics-to-the-stackdriver-system
 *
 * @param  {Object} options
 *   @param  {String} apiKey      - Stackdriver API key from your Stackdriver Account Settings at
 *                                  https://app.stackdriver.com/settings/apikey/add
 *   @param  {String} customerId  - Stackdriver Customer Id
 *   @option {String} host        - Stackdriver API base hostname, which defaults to
 *                                  https://custom-gateway.stackdriver.com/v1/custom
 *   @param  {String} instanceId  - Instance ID to pass along to Stackdriver
 *   @param  {String} prefix      - prefix for every metric
 */
var Client = module.exports = function (options) {

  options = _.defaults(options || {}, {
    host       : 'https://custom-gateway.stackdriver.com/v1/custom',
    instanceId : null,
    prefix     : null
  });

  if (!_.isString(options.apiKey) || options.apiKey.length === 0)
      throw new Error('stackdriver-custom client must be initialized with a '+
                      'non-empty "apiKey" parameter.');

  if (!_.isNumber(options.customerId) || options.customerId < 0)
      throw new Error('stackdriver-custom client must be initialized with a '+
                      'non-empty "customerId" parameter.');

  this.options = options;
};

/**
 * Identifying a user ties all of their actions to an ID, and associates
 * user `traits` to that ID.
 *
 *
 * @param  {String} name         - the name of your metric
 * @param  {Number} value        - the value of your metric
 * @param  {Date}   collected_at - the time you collected this value for the metric
 *
 */
Client.prototype.sendMetric = function (name, value, collected_at, callback) {

  if (!_.isString(name) || name.length <= 0) {
    throw new Error('[stackdriver-custom]#sendMetric: "name" must be non-empty string');
  }

  if (!_.isNumber(value)) {
    throw new Error('[stackdriver-custom]#sendMetric: "value" must be number');
  }

  if (collected_at && !_.isDate(collected_at)) {
    throw new Error('[stackdriver-custom]#sendMetric: "collected_at" must be a date');
  }

  if (!collected_at) {
    collected_at = new Date();
  }

  var metric = { name: name, value: value, collected_at: collected_at };

  return this.sendMetrics([metric], callback);
};


Client.prototype.sendMetrics = function (metrics, callback) {

  var self = this;

  metrics = _.map(metrics, function (metric) {
    if (self.options.prefix)
      metric.name = '[' + self.options.prefix + '] ' + metric.name;
    if (self.options.instanceId)
      metric.instance = self.options.instanceId;

    metric.collected_at = Math.round(metric.collected_at.getTime() / 1000);
    return metric;
  });

  // http://feedback.stackdriver.com/knowledgebase/articles/181488-sending-custom-metrics-to-the-stackdriver-system
  var requestBody = {
    url: this.options.host,
    json: {
      timestamp     : Math.round(Date.now() / 1000),
      proto_version : 1,
      customer_id   : this.options.customerId,
      data          : metrics
    }, headers: {
      'x-stackdriver-apikey' : this.options.apiKey
    }
  };

  return request.post(requestBody, callback);
};