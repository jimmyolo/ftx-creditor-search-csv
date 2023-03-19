'use strict'

const readline = require('node:readline')
const fs = require('node:fs')
const path = require('node:path')

module.exports = () => {
  return new Promise((resolve, reject) => {
    const csvPath = path.join(__dirname, 'ftx_all.csv')
    console.log('checking/loading csv: ', csvPath)
    try {
      fs.lstatSync(csvPath)
    } catch (err) {
      console.error('csv file not found')
      return reject(err)
    }

    const rl = readline.createInterface({
      input: fs.createReadStream(csvPath),
      crlfDelay: Infinity,
    })

    const users = new Map()
    const tokenSet = new Set()

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
      // console.log('EOF')
      // console.log({
      //   users: users.size,
      //   tokenSet: tokenSet,
      // })
      resolve({ users, tokenSet })
    })
  })
}
