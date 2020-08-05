require('es6-promise').polyfill()
require('isomorphic-fetch')
const iconv = require('iconv-lite')
const cheerio = require('cheerio')
const fs = require('fs')
const trim = require('lodash/trim')
const find = require('lodash/find')
const forEach = require('lodash/forEach')

const _ = {
  trim,
  find,
  forEach
}

const host = 'http://vote.nccu.edu.tw/cec/'
const citiesListUrls = {
  y1998: 'vote413.asp?pass1=G199800000000000aaa',
  y2002: 'vote413.asp?pass1=G200200000000000aaa',
  y2005: 'vote413.asp?pass1=G200500000000000aaa',
  y2009: 'vote413.asp?pass1=G200900000000000aaa',
  y2014: 'vote413.asp?pass1=G201400000000000aaa'
}

function printKeelungCouncilsLink(results) {
  if (results === undefined) {
    console.log(results)
    return
  }
  const keelung = _.find(results, { city: "臺灣省基隆市" })
  console.log(JSON.stringify(keelung, null, 2))
}

function tranResponseToObject(body) {
  const results = []
  const $ = cheerio.load(body)
  const tableRows = $('tr')
    console.log(tableRows)

  for (let i=1, l=tableRows.length; i<l; i++) {
    const children = tableRows[i].children
    let k=0
    results.push({
      year: $(children[k++]).text(),
      city: $(children[k++]).text(),
      link: _.trim($('a', children[k]).attr('href'))
    })
  }
  return results
}

function getCitiesList(url, handleResults) {
  fetch(url)
    .then(tranResponseToObject)
    .then(handleResults)
}

_.forEach(citiesListUrls, function(value) {
  getCitiesList(host+value, printKeelungCouncilsLink)
})