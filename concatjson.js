'use strict'
const fs = require('fs')
const thru = require('through2')
const split = require('split2')

function _count (str, c) {
  var count = 0
  for (var i = 0; i < str.length; i += 1) {
    if (str.charAt(i) === c) count += 1
  }
  return count
}

function parse () {
  function parseObj (obj) {
    if (obj === '') {
      return null
    } else {
      var dat
      try {
        dat = JSON.parse(obj)
      } catch (err) {
        if (err) {
          var open = _count(obj, '{')
          var close = _count(obj, '}')
          if (open === close) {
            obj = '{' + obj + '}'
          }
          if (open !== close && open > close) {
            obj = obj + '}'
          }
          if (open !== close && open < close) {
            obj = '{' + obj
          }
          try {
            dat = JSON.parse(obj)
          } catch (err) {
            this.emit('error', err)
          }
        }
      }
      return dat
    }
  }
  return split('}{', parseObj)
}

function serialize () {
  return thru.obj((chunk, enc, callback) => {
    try {
      callback(null, JSON.stringify(chunk))
    } catch (err) {
      callback(err)
    }
  })
}

function append (file, dat, cb) {
  cb = cb || function () {}
  if (typeof dat === 'object') {
    var ser = serialize()
    ser.write(dat)
    ser.end()
    ser.pipe(fs.createWriteStream(file, {flags: 'a'})).on('error', (err) => {
      return cb(err)
    }).on('finish', () => {
      return cb()
    })
  } else if (typeof dat === 'string') {
    fs.createReadStream(dat).on('error', (err) => {
      return cb(err)
    }).pipe(parse()).on('error', (err) => {
      return cb(err)
    }).pipe(serialize()).on('error', (err) => {
      return cb(err)
    }).pipe(fs.createWriteStream(file, {flags: 'a'})).on('error', (err) => {
      return cb(err)
    }).on('finish', () => {
      return cb()
    })
  } else {
    return cb(new TypeError('data must be of type string or object.'))
  }
}

module.exports = {
  parse: parse,
  serialize: serialize,
  append: append
}