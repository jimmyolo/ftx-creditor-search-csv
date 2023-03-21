'use strict'

const path = require('node:path')

const load = require('./load.js')

const inquirer = require('inquirer')
const { SearchList, SearchCheckbox, fuzzyFilter } = require('@cz-git/inquirer')
inquirer.registerPrompt('search-list', SearchList)
inquirer.registerPrompt('search-checkbox', SearchCheckbox)

const _search = (src = [], filters = []) => {
  return src.filter(([cid, { assets }]) => {
    for (const f of filters) {
      if (assets.indexOf(f) === -1) {
        return false
      }
    }
    return true
  })
}

const startSearchPrompts = async (users, choices) => {
  const { pickedTokens } = await inquirer.prompt([{
    type: 'search-checkbox',
    name: 'pickedTokens',
    message: 'Select your token',
    pageSize: 5,
    source: function (answers, input) {
      return fuzzyFilter(input, choices)
    },
    validate: function (answer) {
      if (answer.length < 1) {
        return 'You must choose at least one topping.'
      }
      return true
    },
  }])
  const usersFilterByToken = _search(Array.from(users), pickedTokens)
  console.log('found', usersFilterByToken.length, 'users')

  while (true) {
    const { action } = await inquirer.prompt([{
      type: 'expand',
      name: 'action',
      message: 'more action?',
      choices: [
        { key: 'a', name: 'add/change token amount', value: 'a' },
        { key: 'r', name: 're-select tokens', value: 'r' },
        { key: 's', name: 'show current search results', value: 's' },
        { key: 'q', name: 'quit', value: 'q' },
      ],
    }])

    if (action === 'q') break

    if (action === 's') {
      console.log(usersFilterByToken)
      continue
    }

    if (action === 'r') {
      await startSearchPrompts(users, choices)
      return
    }

    if (action === 'a') {
      const { inputAmount } = await inquirer.prompt([{
        type: 'input',
        name: 'inputAmount',
        suffix: '>',
        message:
          `the order should be the same as above picked tokens.\n` +
          `use comma, to separate each\n` +
          `allow empty for no filter. ex: ,22,0.01\n`,
        default: ',,',
      }])
      console.log('input amounts', inputAmount)
      const amounts = inputAmount.split(',')
      const searchTargets = pickedTokens.map((t, i) => {
        const v = (amounts[i] || '').trim()
        return `${t}[${v}`
      })
      console.log('searchTargets', searchTargets)
      const usersFilterByTokenAndVol = _search(usersFilterByToken, searchTargets)
      console.log('found', usersFilterByTokenAndVol.length, 'users')
    }
  }
}

const main = async () => {
  const { fileOrDirectory } = await inquirer.prompt([{
    type: 'input',
    name: 'fileOrDirectory',
    message: 'Enter csv filepath or directory',
    default: path.join('./csv'),
    // transformer: (filename) => {
    //   return filename.trim().replace(/\.csv/ig, '') + '.csv'
    // }
  }])

  const {
    users,
    tokenSet,
    incomplete,
  } = await load(fileOrDirectory)

  console.log('loaded', users.size, 'users')
  console.log('loaded', tokenSet.size, 'tokens')
  console.log('incomplete (too long...)', incomplete.size)

  const tokensForFilter = Array.from(tokenSet).map(t => {
    const c = {
      name: t,
      value: t,
      ...(() => {
        if (t === 'NFT') {
          return {
            name: 'NFT (xxx)[1]',
            disabled: true,
            short: 'NFT',
          }
        }
        return {}
      })(),
    }
    return c
  })

  await startSearchPrompts(users, tokensForFilter)
}

main().catch(err => {
  console.error(err)
  return main()
})
