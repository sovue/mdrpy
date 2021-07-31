const {readFileSync} = require('fs')

const {parse} = require('../dist/index')

const exampleFile = readFileSync('./example.md').toString()

const res = parse(exampleFile)

console.log(res)
