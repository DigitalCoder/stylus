
/*!
 * CSS - Lexer
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Token = require('./token')
  , nodes = require('./nodes');

/**
 * Initialize a new `Lexer` with the given `str` and `options`.
 *
 * @param {String} str
 * @param {Object} options
 * @api private
 */

var Lexer = module.exports = function Lexer(str, options) {
  options = options || {};
  this.str = str;
  this.filename = options.filename || 'css';
  this.stash = [];
  this.prevIndents = 0;
};

/**
 * Lexer prototype.
 */

Lexer.prototype = {

  /**
   * Lookahead `n` tokens.
   *
   * @param {Number} n
   * @return {Object}
   * @api private
   */
  
  lookahead: function(n){
    var fetch = n - this.stash.length;
    while (fetch-- > 0) this.stash.push(this.next);
    return this.stash[--n];
  },

  /**
   * Fetch next token.
   *
   * @return {Token}
   * @api private
   */

  get next() {
    return this.stashed
      || this.newline
      || this.variable
      || this.assignment
      || this.color
      || this.id
      || this.eos;
  },

  /**
   * Lookahead a single token.
   *
   * @return {Token}
   * @api private
   */
  
  get peek() {
    return this.lookahead(1);
  },
  
  /**
   * Return the next possibly stashed token.
   *
   * @return {Token}
   * @api public
   */

  get stashed() {
    return this.stash.shift();
  },

  /**
   * Check current property state.
   *
   * @return {Boolean}
   * @api public
   */

  get isProperty() {
    return 1 == this.prevIndents % 2;
  },

  /**
   * EOS | trailing outdents.
   */

  get eos() {
    if (this.str.length) return;
    return this.prevIndents-- > 0
      ? new Token('outdent')
      : new Token('eos');
  },

  /**
   * @[-\w]+
   */

  get variable() {
    var captures;
    if (captures = /^@([-\w]+)/.exec(this.str)) {
      this.isVariable = true;
      this.str = this.str.substr(captures[0].length);
      return new Token('variable', captures[1]);
    }
  },

  /**
   * : *
   */
  
  get assignment() {
    var captures;
    if (this.isVariable && (captures = /^: */.exec(this.str))) {
      this.str = this.str.substr(captures[0].length);
      return new Token('assignment');
    }
  },

  /**
   * '\n' ' '+
   */

  get newline() {
    var captures;
    if (captures = /^\n( *)/.exec(this.str)) {
      this.str = this.str.substr(captures[0].length);
      var tok
        , spaces = captures[1].length
        , indents = spaces / 2;

      // Reset state
      this.isVariable = false;

      // To few spaces
      if (0 != spaces % 2) {
        throw new Error('Invalid indentation, got ' + spaces + ' space(s), expected multiple of 2');
      // To many spaces
      } else if (indents > this.prevIndents + 1) {
        var expected = 2 * this.prevIndents || 2;
        throw new Error('Invalid indentation, got ' + spaces + ' space(s), expected ' + expected);
      // Outdent
      } else if (indents < this.prevIndents) {
        var n = this.prevIndents - indents;
        while (--n) this.stash.push(new Token('outdent'));
        this.prevIndents = indents;
        tok = new Token('outdent');
      // Indent
      } else if (indents != this.prevIndents) {
        this.prevIndents = indents;
        tok = new Token('indent');
      } else {
        return this.next;
      }

      return tok;
    }
  },

  /**
   * hex | rgba | rgb
   */

  get color() {
    return this.hex
      || this.rgba
      || this.rgb;
  },

  /**
   * hex6 | hex3
   */

  get hex() {
    return this.hex6
      || this.hex3;
  },

  /**
   * rgb(n,n,n)
   */

  get rgb() {
    var captures;
    if (captures = /^rgb\( *(\d+) *, *(\d+) *, *(\d+) *\)/.exec(this.str)) {
      this.str = this.str.substr(captures[0].length);
      var r = parseInt(captures[1], 10)
        , g = parseInt(captures[2], 10)
        , b = parseInt(captures[3], 10);
      return new Token('color', new nodes.Color(r, g, b, 1));
    }    
  },
  
  /**
   * rgba(n,n,n,n)
   */
  
  get rgba() {
    var captures;
    if (captures = /^rgba\( *(\d+) *, *(\d+) *, *(\d+) *, *(\d+(?:\.\d+)?) *\)/.exec(this.str)) {
      this.str = this.str.substr(captures[0].length);
      var r = parseInt(captures[1], 10)
        , g = parseInt(captures[2], 10)
        , b = parseInt(captures[3], 10)
        , a = parseFloat(captures[4]);
      return new Token('color', new nodes.Color(r, g, b, a));
    }    
  },
  
  /**
   * #nnn
   */
  
  get hex3() {
    var captures;
    if (captures = /^#([a-f-A-F0-9]{3})/.exec(this.str)) {
      this.str = this.str.substr(4);
      var rgb = captures[1]
        , r = parseInt(rgb[0] + rgb[0], 16)
        , g = parseInt(rgb[1] + rgb[1], 16)
        , b = parseInt(rgb[2] + rgb[2], 16);
      return new Token('color', new nodes.Color(r, g, b, 1)); 
    }
  },
  
  /**
   * #nnnnnn
   */
  
  get hex6() {
    var captures;
    if (captures = /^#([a-f-A-F0-9]{6})/.exec(this.str)) {
      this.str = this.str.substr(7);
      var rgb = captures[1]
        , r = parseInt(rgb.substr(0, 2), 16)
        , g = parseInt(rgb.substr(2, 2), 16)
        , b = parseInt(rgb.substr(4, 2), 16);
      return new Token('color', new nodes.Color(r, g, b, 1)); 
    }
  },

  /**
   * property | selector
   */
  
  get id() {
    return this.property
      || this.selector;
  },
  
  /**
   * [-a-z][-a-z0-9]*
   */
  
  get property() {
    var captures;
    if (this.isProperty) {
      if (captures = /^([-a-z][-a-z0-9]*) */.exec(this.str)) {
        var prop = captures[1];
        this.str = this.str.substr(captures[0].length);
        return new Token('property', prop);
      }
    }
  },

  /**
   * [^\n]+
   */
  
  get selector() {
    var captures;
    if (captures = /^[^\n]+/.exec(this.str)) {
      var selector = captures[0];
      this.str = this.str.substr(selector.length);
      return new Token('selector', selector);
    }
  }
};