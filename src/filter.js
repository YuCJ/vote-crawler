const fs = require('fs')
const _ = require('lodash')

async function saveVotesToJSON(outputFileName) {
  const allCouncils =  JSON.parse(fs.readFileSync('allCouncils.json'))
  const tragetCouncils = _.filter(allCouncils, { constituency: '基隆市第五選區' })
  let outputResults = []
  for (let i=0, l=tragetCouncils.length; i<l; i++) {
    const councilObj = tragetCouncils[i]
    const councilDeepObject = await getConcil(councilObj.nameLink)
    const councilVotesObjectsArray = await getVotesOfCouncil(councilDeepObject.nameLink)
    for (let j=0, l2=councilVotesObjectsArray.length; j<l2; j++) {
      const councilVotesObject = councilVotesObjectsArray[j]
      const councilObjConstituency = councilObj.constituency
      const councilVotesObjectConstituency = councilVotesObject.constituency
      const councilInfoAddedObject = {
        year: councilObj.year,
        city: councilObjConstituency.slice(0,3),
        constituency: councilObjConstituency.slice(3,7),
        district: councilVotesObjectConstituency.slice(7).split('區')[0]+'區',
        village: councilVotesObjectConstituency.slice(7).split('區')[1],
        name: (councilObj.name === councilVotesObject.name) ? councilObj.name : null,
        number: (councilObj.number === councilVotesObject.number) ? councilObj.number : null,
        gender: councilObj.gender,
        totalVotes: councilObj.votes,
        villageVotes: councilVotesObject.votes,
        totalPercentage: councilObj.percentage,
        villagePercentage: councilVotesObject.percentage,
        birth: councilObj.birth,
        party: councilObj.party,
        elected: councilObj.elected,
        reElected: councilObj.reElected,
      }
      outputResults.push(councilInfoAddedObject)
    }
  }
  fs.writeFileSync(outputFileName, JSON.stringify(outputResults))
  console.log('done', outputResults.length)
}

saveVotesToJSON('keelung05votes.json')