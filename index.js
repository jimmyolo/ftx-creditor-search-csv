'use strict'

const load = require('./load.js')

const inquirer = require('inquirer')
const { SearchList, fuzzyFilter } = require("@cz-git/inquirer")
inquirer.registerPrompt('search-list', SearchList)

const main = async () => {
  const _filenameAnswers = await inquirer.prompt([{
    type: 'input',
    name: 'filename',
    message: 'Enter csv filename',
    default: 'ftx_all.csv',
    // transformer: (filename) => {
    //   return filename.trim().replace(/\.csv/ig, '') + '.csv'
    // }
  }])

  const filename = _filenameAnswers.filename.trim().replace(/\.csv/ig, '') + '.csv'
  const {
    users,
    tokenSet,
    incomplete
  } = await load(filename)

  console.log('loaded', users.size, 'users')
  console.log('loaded', tokenSet.size, 'tokens')

  const filterTokens = Array.from(tokenSet).map(t => ({ name: t, value: t }))

  await inquirer.prompt([{
    type: 'search-list',
    name: 'token',
    message: 'Select your token',
    pageSize: 5,
    source: function (answers, input) {
      return fuzzyFilter(input, filterTokens);
    }
  }]).then(({ token }) => {
    console.log('token selected', token)
  })
}
main()

/*
load().then(({ users, tokenSet }) => {
  console.log('loaded', users.size, 'users')
  inquirer.prompt([{
    type: 'input',
    name: 'id',
    message: 'Enter user id',
  }]).then(({ id }) => {
    const user = users.get(id)
    if (!user) {
      console.log('user not found')
      return
    }

    console.log('user found')
    console.log({
      id: user.id,
      name: user.name,
      email: user.email,
      assets: user.assets,
      token: tokenSet.has(user.id),
    })
  })
})
*/
