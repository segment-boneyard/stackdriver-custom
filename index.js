var _           = require('underscore'),
    events      = require('events'),
    util        = require('util'),
    requests    = require('request');

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
 *   @param  {String} instance    - Instance ID to pass along to Stackdriver
 *   @param  {boolean} debug      - debug mode to log additional information
 */
var Client = module.exports = function (options) {

  this.initialized = false;

  // No-op on error so we don't kill the server.
  this.on('error', function () {});

  if (options) this.init(options);
};

util.inherits(Client, events.EventEmitter);


/**
 * Initializes this client.
 *
 * @param  {Object} options
 *   @param  {String} apiKey      - Stackdriver API key
 *   @param  {String} customerId  - Stackdriver Customer Id
 *   @option {String} host        - Stackdriver API base hostname
 */
Client.prototype.init = function (options) {

  if (!_.isString(options.apiKey) || options.apiKey.length === 0)
      throw new Error('stackdriver-custom client must be initialized with a '+
                      'non-empty "apiKey" parameter.');

  if (!_.isNumber(options.customerId) || options.customerId < 0)
      throw new Error('stackdriver-custom client must be initialized with a '+
                      'non-empty "customerId" parameter.');

  this.apiKey     = options.apiKey;
  this.customerId = options.customerId;
  this.host       = options.host || 'https://custom-gateway.stackdriver.com/v1/custom';
  this.debug      = options.debug || false;
  this.instance   = options.instance;

  this.initialized = true;

  this.emit('initialize');
};


/**
 * Internal method to check whether the client has been initialized.
 * @private
 */
Client.prototype._checkInitialized = function () {
  if (!this.initialized)
    throw new Error('stackdriver-custom client is not initialized. Please call ' +
                    'client.init(options).');
};

/**
 * Log to console if debug is enabled
 * @private
 * 
 * @param  {mixed} message whatever you want to log to console
 */
Client.prototype._debug = function(message) {
  if (this.debug)
    console.log(message)
};


/**
 * Identifying a user ties all of their actions to an ID, and associates
 * user `traits` to that ID.
 *
 *
 * @param  {String} name        - the name of your metric
 * @param  {Number} value       - the value of your metric
 * @param  {Date}   collectedAt - the time you collected this value for the metric
 *
 */
Client.prototype.sendMetric = function (name, value, collectedAt) {

  this._checkInitialized();

  if (!_.isString(name) || name.length <= 0) {
    throw new Error('[stackdriver-custom]#sendMetric: "name" must be non-empty string');
  }

  if (!_.isNumber(value)) {
    throw new Error('[stackdriver-custom]#sendMetric: "value" must be number');
  }

  if (collectedAt && !_.isDate(collectedAt)) {
    throw new Error('[stackdriver-custom]#sendMetric: "collectedAt" must be a date');
  }

  var time = (collectedAt || new Date()).getTime();
  var timestamp = Math.round(time/1000);

  // Create the json message body
  var message = {
    timestamp     : timestamp,
    customer_id   : this.customerId,
    proto_version : '1',
    data : {
        name         : name,
        value        : value,
        collected_at : timestamp
    } 
  };

  // Add instance if provided
  if (this.instance)
    message.data.instance = this.instance;

  // Create the headers
  var headers = {
    'x-stackdriver-apikey' : this.apiKey
  };

  // Create the full request
  var request = {
    url     : this.host,
    headers : headers,
    json    : message
  };

  // POST the message
  this._debug(request);
  requests.post(request, function (err, response, body) {
    if (err)
      throw new Error(err);
    else if (response.statusCode !== 201) {
      throw new Error((body && body.error && body.error.message) ||
                          'Server error ('+response.statusCode+'): ' + JSON.stringify(body));
    }
    else
      return;
  });
};