'use strict'

const readline = require('node:readline')
const fs = require('fs-extra')
const path = require('node:path')

const loadFile = (filename = 'ftx_all.csv') => {
  const users = new Map()
  const tokenSet = new Set()
  const incomplete = new Map()

  return new Promise((resolve, reject) => {
    const csvPath = path.join(__dirname, filename)
    console.log('loading csv file: ', csvPath)
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

    const parseAssets = (cid = '', assets = '', isIncomplete = false) => {
      // if (['01613473', '06786371'].includes(cid)) {
      //   console.log({ cid, assets })
      // }
      assets = assets.trim().replace(/"|\s/g, '')
      const tokens = assets.split(',')

      if (isIncomplete) incomplete.set(cid, assets)

      tokens.forEach(t => {
        // NFT (395640136040522434)[1]
        // LOCKED_MAPS_STRIKE-0.07_VEST-2030[2000.0000000000000000]
        const token = t.match(/(?<name>[\w-.]+)(\((?<nft>\w+)\))?\[(?<vol>[+-]?\d+(\.\d+)?)\]/)?.groups || {}
        if (token.name) {
          tokenSet.add(token.name)
        }
      })

      users.set(cid, {
        assets,
        tokens,
      })
    }

    const _isCID = (cid = '') => cid.length === 8 && +cid > 0

    const _parseNextUser = l => {
      const comma = l.indexOf(',')
      let id = l.slice(0, comma)

      if (_isCID(id)) return { id, assets: l.slice(comma + 1) }

      // special case for some users...
      // 03508433 BCHBULL[39800.0000000000000000],BSVBULL[16500000.0000000000000000],...
      const space = l.indexOf(' ')
      const isLeadingQuote = l.charAt(0) === '"'
      id = l.slice(isLeadingQuote ? 1 : 0, space)
      if (_isCID(id)) {
        return {
          id,
          assets: `${isLeadingQuote ? '"' : ''}${l.slice(space + 1)}`
        }
      }

      return {}
    }

    const onLine = (() => {
      let cid = ''
      let unfinished = ''

      return (l) => {
        l = l.trim()
        if (!l) return

        if (cid && unfinished) {
          // incomplete assets... too long?
          // example:
          // 00334864,"ATOM[0.0843200000000000],BCH[0.0000000055000000],BTC[0.0000000019256250],BULL[0.0000042137540000],COPE[0.1553700000000000],CREAM[0.0000000025000000],ETH[0.0000000026000000],FTT[1474.9691854382876185],HOOD[0.0000000100000000],HOOD_PRE[-
          let { id, assets } = _parseNextUser(l)
          if (_isCID(id)) {
            parseAssets(cid, unfinished, true)
            unfinished = ''

            cid = id
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

        // const comma = l.indexOf(',')
        // const id = cid = l.slice(0, comma)
        // const assets = l.slice(comma + 1) || ''
        let { id, assets } = _parseNextUser(l)
        cid = id
        if (!assets) {
          console.log('no assets', { id, assets, line: l })
        }

        // incomplete assets... too long?
        // example:
        // 00334864,"ATOM[0.0843200000000000],BCH[0.0000000055000000],BTC[0.0000000019256250],BULL[0.0000042137540000],COPE[0.1553700000000000],CREAM[0.0000000025000000],ETH[0.0000000026000000],FTT[1474.9691854382876185],HOOD[0.0000000100000000],HOOD_PRE[-
        if (assets.charAt(0) === '"' && !assets.endsWith(']"')) {
          unfinished = assets
          return
        }

        parseAssets(cid, assets)
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
      resolve({ users, tokenSet, incomplete })
    })
  })
}

module.exports = async (fileOrDirectory = 'ftx_all.csv') => {
  try {
    const lstat = await fs.lstat(path.join(__dirname, fileOrDirectory))
    if (lstat.isFile()) {
      return loadFile(fileOrDirectory)
    }

    return fs.readdir(fileOrDirectory).then(files => {
      return Promise.all(files.map(f => loadFile(path.join(fileOrDirectory, f)))).then(results => {
        return results.reduce((acc, { users, tokenSet, incomplete }) => {
          users.forEach((v, k) => acc.users.set(k, v))
          tokenSet.forEach(t => acc.tokenSet.add(t))
          incomplete.forEach((v, k) => acc.incomplete.set(k, v))
          return acc
        }, { users: new Map(), tokenSet: new Set(), incomplete: new Map() })
      })
    })
  } catch (err) {
    console.error(err)
  }
}
