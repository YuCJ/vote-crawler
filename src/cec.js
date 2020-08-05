const request = require('request')
const iconv = require('iconv-lite');
const cheerio = require('cheerio')
const fs = require('fs')
const reduce = require('lodash/reduce')

const _ = {
  reduce
}

const host = 'http://db.cec.gov.tw/histQuery.jsp?'
const queryObj = {
  voteCode: '20091201T1C2', // 縣市議員選舉
  qryType: 'ctks',          // 候選人得票明細
  prvCode: '03',            // 
  cityCode: '017',          // 基隆市
  areaCode: '01',           // 第一選區
  andNo: '9'                // 九號候選人
}

function buidUrl(host, queryObj) {
  const queryString = _.reduce(queryObj, function(result, value, key){
    return result ? (result+'&'+key+'='+value) : (key+'='+value)
  }, '')
  return (host+queryString)
}


const urlToFetch = buidUrl(host, queryObj)
const callback = function (err, htttpResponse, body) {
  if (err) {
    console.log(err)
    return
  }
  if(body) {
    const $ = cheerio.load(body)
    const results = []
    const tableRows = $('tr')
    console.log(tableRows)
  }
}

request({
  url: urlToFetch,
  method: 'GET',
}, callback)