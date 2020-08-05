'use strict'
const request = require('request-promise')
const iconv = require('iconv-lite');
const cheerio = require('cheerio')
const fs = require('fs')
const _ = require('lodash')
const shortid = require('shortid')


/*

第一層網頁爬下來的資料會是：

candidateInfo = {
  constituency: '基隆市第一選區',
  constituencyPath: 'vote31.asp?pass1=G2014A621701000000',
  name: '呂美玲',
  number: 1,
  gender: 'F',
  birth: '1964',
  party: '中國國民黨',
  votes: 5434,
  percentage: '21.88%',
  elected: 'Y',
  reElected: 'Y',
}

第三層網頁爬下來的資料會是：

cadidateVotes = [{
  area: '基隆市第一選區中正區德義里',
  name: '呂美玲',
  number: 1,
  votes: 127,
  percentage: '27.02%'
}, {
  area: '基隆市第一選區中正區正義里',
  name: '呂美玲',
  number: 1,
  votes: 122,
  percentage: '18.77%'
}, ...]

目標：

candidate = {
  city: '基隆市',
  constituency: 1,
  district: '中正區',
  village: '德義里',
  name: '呂美玲',
  no: 1,
  votes: 127,
  percentage: 27.02%,
  party
}

*/

/*

要爬的目標

HOST: http://vote.nccu.edu.tw/cec/
1998	第 14 屆 縣(市)議員選舉 vote413.asp?pass1=G199800000000000aaa
2002	第 15 屆 縣(市)議員選舉	vote413.asp?pass1=G200200000000000aaa
2005	第 16 屆 縣(市)議員選舉 vote413.asp?pass1=G200500000000000aaa
2009	第 17 屆 縣(市)議員選舉 vote413.asp?pass1=G200900000000000aaa
2014	第 18 屆 縣(市)議員選舉 vote413.asp?pass1=G201400000000000aaa

*/

// fs.writeFileSync(outputFileName, JSON.stringify(outputResults))

const HOST = 'http://vote.nccu.edu.tw/cec/'

function setOption(path) {
  return {
    uri: path,
    baseUrl: HOST,
    method: 'GET',
    encoding: null,
    transform: (body) => {
      const decodedBody = iconv.decode(body, 'big5')
      return cheerio.load(decodedBody)
    }
  }
}

function _handelError (error) {
  console.log(error)
}

// 第一層 處理各縣市表格

const PATHS_OF_CITIES_LISTS = {
  y1998: 'vote413.asp?pass1=G199800000000000aaa',
  y2002: 'vote413.asp?pass1=G200200000000000aaa',
  y2005: 'vote413.asp?pass1=G200500000000000aaa',
  y2009: 'vote413.asp?pass1=G200900000000000aaa',
  y2014: 'vote413.asp?pass1=G201400000000000aaa'
}


// 處理單一年
// result => { year, city, path }

function getCities(path) {
  return request(setOption(path))
    .then(function ($) {
      let results = []
      const tableRows = $('tr')
      for (let i=1, l=tableRows.length; i<l; i++) {
        const children = tableRows[i].children
        let k=0
        results.push({
          year: $(children[k++]).text(),
          city: $(children[k++]).text(),
          path: _.trim($('a', children[k]).attr('href'))
        })
      }
      return results
    })
    .catch(_handelError)
}

// 處理所有年
// paths => { year: [{ year, city, path }, ...], ... }

async function getAllElections(paths) {
  const years = _.keys(PATHS_OF_CITIES_LISTS)
  let results = {}
  for (let i=0, l=years.length; i<l; i++) {
    const key = years[i]
    const value = await getCities(paths[key])
    results[key] = value
  }
  return results
}

// 第二層 處理議員候選人資料 ================

function getCouncils(path) {
  return request(setOption(path))
    .then(function($) {
      const results = []
      const tableRows = $('tr')
      for (let i=1, l=tableRows.length; i<l; i++) {
        const children = tableRows[i].children
        let k=0
        results.push({
          districtLink: $('a', children[k]).attr('href'),
          constituency: $(children[k++]).text(),
          nameLink: $('a', children[k]).attr('href'),
          name: $(children[k++]).text(),
          number: $(children[k++]).text(),
          gender: $(children[k++]).text(),
          birth: $(children[k++]).text(),
          party: $(children[k++]).text(),
          votes: $(children[k++]).text(),
          percentage: $(children[k++]).text(),
          elected: $(children[k++]).text(),
          reElected: $(children[k++]).text()
        })
      }
      return results
    })
    .catch(_handelError)
}

// 第三層

function getConcil(path) {
  return request(setOption(path))
    .then(function($) {
      const children = $('tr')[1].children
      let k = 0
      return {
        constituency: $(children[k++]).text(),
        nameLink: $('a', children[k]).attr('href'),
        name: $(children[k++]).text(),
        number: $(children[k++]).text(),
        votes: $(children[k++]).text(),
        percentage: $(children[k++]).text()
      }
    })
    .catch(_handelError)
}


// 第四層 
function getVotesOfCouncil(path) {
  return request(setOption(path))
    .then(function($) {
      const results = []
      const tableRows = $('tr')
      for (let i=1, l=tableRows.length; i<l; i++) {
        const children = tableRows[i].children
        let k=0
        results.push({
          constituency: $(children[k++]).text(),
          name: $(children[k++]).text(),
          number: $(children[k++]).text(),
          votes: $(children[k++]).text(),
          percentage: $(children[k++]).text()
        })
      }
      return results
    })
    .catch(_handelError)
}


// 抓資料

async function saveAllCouncilsToJSON(paths, outputFileName) {
  // 把全部第一層存成陣列： [{ year, city, path }, ...]
  const allElectionsObj = await getAllElections(paths)
  const cityObjectsArr = _.reduce(allElectionsObj, function (result, value) {
    return (_.isArray(value)) ? _.concat(result, value) : result
  }, [])

  // 把全部第二層存成陣列
  let allCouncilsObjectsArr = []
  for (let i=0, l1=cityObjectsArr.length; i<l1; i++) {
    const cityObj = cityObjectsArr[i]
    const councilObjectsArray = await getCouncils(cityObj.path)
    for (let j=0, l2=councilObjectsArray.length; j<l2; j++) {
      const councilObj = councilObjectsArray[j]
      const cityInfoAddedObj = _.assign({}, councilObj, {
        year: cityObj.year,
        city: cityObj.city
      })
      allCouncilsObjectsArr.push(cityInfoAddedObj)
    }
  }
  fs.writeFileSync(outputFileName, JSON.stringify(allCouncilsObjectsArr))
  console.log('done')
}
// 執行
// saveAllCouncilsToJSON(PATHS_OF_CITIES_LISTS, 'allCouncils.json')

// fs.writeFileSync(outputFileName, JSON.stringify(outputResults))

/**
 * 輸出基隆市議員連結
 * 
 * @param {any} results - 各縣市「縣(市)議員候選人得票概況」的 object
 */
/*function printKeelungCouncilsLink(results) {
  if (results === undefined) {
    console.log(results)
    return
  }
  const keelung = _.find(results, { city: "臺灣省基隆市" })
  console.log(JSON.stringify(keelung, null, 2))
}

const data ={}
_.forEach(citiesListPaths, function(value) {
  getCitiesList(host+value, addDataToObject, data)
})
*/





// Step1: Get 第一層 candidate infos to json 
// 五屆都裝進同一個json
/*
function _handleFetchCity (err, htttpResponse, body) {
  if (err) {
    console.log(err)
    return
  }
  if(body) {
    const decodedBody = iconv.decode(body, 'big5')
    const $ = cheerio.load(decodedBody)
    const results = []
    const tableRows = $('tr')
    const tableHeads = tableRows[0].children
    for (let i=1, l=tableRows.length; i<l; i++) {
      const children = tableRows[i].children
      console.log('length', children.length)
      let k=0
      results.push({
        constituency: $(children[k++]).text(),
        districtLink: $('a', children[k]).attr('href'),
        name: $(children[k++]).text(),
        number: $(children[k++]).text(),
        gender: $(children[k++]).text(),
        birth: $(children[k++]).text(),
        party: $(children[k++]).text(),
        votes: $(children[k++]).text(),
        percentage: $(children[k++]).text(),
        elected: $(children[k++]).text(),
        reElected: $(children[k++]).text()
      })
    }
    return results
  }
}

function getCityCouncilorsList(url) {
  request({
    url: url,
    method: 'GET',
    encoding: null
  }, _handleFetchCity)
}
*/
// Step2: Get 第三層 candidate votes to json
// 五屆都裝進同一個json




/*

基隆市 縣(市)議員選舉 候選人得票概況

function printKeelungCouncilsLink(results) {
  if (results === undefined) {
    console.log(results)
    return
  }
  const keelung = _.find(results, { city: "臺灣省基隆市" })
  console.log(JSON.stringify(keelung, null, 2))
}

_.forEach(citiesListPaths, function(value) {
  getCitiesList(host+value, printKeelungCouncilsLink)
})

{
  "year": "1998",
  "city": "臺灣省基隆市",
  "link": "vote3.asp?pass1=G199806217000000aaa"
}
{
  "year": "2014",
  "city": "臺灣省基隆市",
  "link": "vote3.asp?pass1=G201406217000000aaa"
}
{
  "year": "2002",
  "city": "臺灣省基隆市",
  "link": "vote3.asp?pass1=G200206217000000aaa"
}
{
  "year": "2009",
  "city": "臺灣省基隆市",
  "link": "vote3.asp?pass1=G200906217000000aaa"
}
{
  "year": "2005",
  "city": "臺灣省基隆市",
  "link": "vote3.asp?pass1=G200506217000000aaa"
}

*/