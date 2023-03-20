'use strict'

const load = require('./load.js')

const prompts = require('prompts')

const main = async () => {
  const { fileOrDirectory } = await prompts([{
    type: 'text',
    name: 'fileOrDirectory',
    message: 'Enter csv filename',
    initial: './csv/',
  }])

  const {
    users,
    tokenSet,
    incomplete
  } = await load(fileOrDirectory)

  console.log('loaded', users.size, 'users')
  console.log('loaded', tokenSet.size, 'tokens')

  const filterTokens = Array.from(tokenSet).map(t => {
    const c = {
      title: t,
      value: t,
      ...(() => {
        if (t === 'NFT') {
          return {
            disabled: true,
            description: `I don't have NFT...not sure how to search`
          }
        }
        return {}
      })()
    }
    return c
  })

  const { pickTokens } = await prompts([{
    type: 'autocompleteMultiselect',
    name: 'pickTokens',
    message: 'Pick your token(s)',
    choices: filterTokens,
    min: 1,
  }])

  console.log('selected tokens', pickTokens)
  let results = Array.from(users).filter(([cid, { assets }]) => {
    for (const t of pickTokens) {
      if (assets.indexOf(`${t}[`) === -1) {
        return false
      }
    }
    return true
  })
  console.log('found', results)
}
main()
