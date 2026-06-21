const { parse, tokenize } = require('./src/parser.js')
const { tokenize: tokenizeTokens } = require('./src/tokenizer.js')
const Record = require('./src/record.js').default
const Token = require('./src/token.js').default

exports.Parser = { parse, tokenize }
exports.Tokenizer = { tokenize: tokenizeTokens }
exports.Token = Token
exports.Record = Record
