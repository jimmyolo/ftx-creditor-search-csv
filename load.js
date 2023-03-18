'use strict'

const readline = require('node:readline')
const fs = require('node:fs')

const rl = readline.createInterface({
  input: fs.createReadStream('./ftx_all.csv'),
  crlfDelay: Infinity
})

let lines = 0
let users = new Map()
let tokenSet = new Set()

const parseAssets = (cid = '', assets = '') => {
  // if (['01613473', '06786371'].includes(cid)) {
  //   console.log({ cid, assets })
  // }
  assets = assets.trim().replace(/"|\s/g, '')
  const tokens = assets.split(',')

  tokens.forEach(t => {
    const token = t.match(/(?<name>\w+)(\((?<nft>\w+)\))?\[(?<vol>[+-]?\d+(\.\d+)?)\]/)?.groups || {}
    if (token.name) {
      tokenSet.add(token.name)
    }
  })

  users.set(cid, {
    assets,
    tokens,
  })
}

const onLine = (() => {
  let cid = ''
  let unfinished = ''

  return (l) => {
    lines++
    l = l.trim()
    if (!l) return

    if (cid && unfinished) {
      // uncompleted assets... too long?
      const comma = l.indexOf(',')
      const nextId = l.slice(0, comma)
      if (nextId.length === 8 && +nextId > 0) {
        parseAssets(cid, unfinished)
        unfinished = ''

        cid = nextId
        const assets = l.slice(comma + 1)
        if (assets.charAt(0) === '"' && !assets.endsWith(']"')) {
          unfinished = assets
          return
        }

        parseAssets(cid, assets)
        cid = ''
        unfinished = ''
        return
      }

      unfinished += l
      if (!l.endsWith(']"')) return

      parseAssets(cid, unfinished)
      unfinished = ''
      cid = ''
      return
    }
  
    if (l.startsWith('Customer')) return

    const comma = l.indexOf(',')
    const id = cid = l.slice(0, comma)
    const assets = l.slice(comma + 1) || ''

    if (assets.charAt(0) === '"' && !assets.endsWith(']"')) {
      unfinished = assets
      return
    }

    parseAssets(id, assets)
    cid = ''
    unfinished = ''
  }
})()


rl.on('line', onLine)
rl.on('close', () => {
  console.log('EOF')
  console.log({
    lines,
    users: users.size,
    tokenSet: tokenSet,
  })
})
