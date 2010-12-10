
/*!
 * CSS - Token
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var inspect = require('sys').inspect;

/**
 * Initialize a new `Token` with the given `type` and `val`.
 *
 * @param {String} type
 * @param {Mixed} val
 * @api private
 */

var Token = module.exports = function Token(type, val) {
  this.type = type;
  this.val = val;
};

/**
 * Custom inspect.
 *
 * @return {String}
 * @api public
 */

Token.prototype.inspect = function(){
  return '[Token '
    + '\x1b[32m' + this.type + '\x1b[0m'
    + '\x1b[33m' + (this.val ? ' ' + inspect(this.val) : '') + '\x1b[0m'
    + ']';
};