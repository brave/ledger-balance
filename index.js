var datax = require('data-expression')
var http = require('http')
var https = require('https')
var Joi = require('joi')
var underscore = require('underscore')
var url = require('url')

var schema = Joi.array().min(1).items(Joi.object().keys(
  { name: Joi.string().required().description('commonly-known name of provider'),
    site: Joi.string().uri().required().description('associated website'),
    server: Joi.string().uri({ schema: /https?/ }).required().description('HTTP(s) location of service'),
    path: Joi.string().required().description('path to evaluate for endpoint'),
    method: Joi.string().valid('GET', 'POST', 'PUT').optional().description('HTTP method'),
    payload: Joi.string().optional().description('exprssion to evaluate for HTTP payload'),
    satoshis: Joi.string().required().description('expression to evaluate to resolve to satoshis'),
    description: Joi.string().optional().description('a brief annotation')
  }
))

var providers = [
  // blockexplorer and bitpay both running insight API
  { name: 'Bitcoin Block Explorer',
    site: 'https://blockexplorer.com/',
    server: 'https://blockexplorer.com',
    path: "'/api/addr/' + address + '?noTxList=1'",
    satoshis: 'body.balanceSat'
  },
  { name: 'BitPay',
    site: 'https://insight.bitpay.com',
    server: 'https://insight.bitpay.com',
    path: "'/api/addr/' + address + '?noTxList=1'",
    satoshis: 'body.balanceSat'
  },

  { name: 'BitcoinChain.com',
    site: 'https://bitcoinchain.com/',
    server: 'https://api-r.bitcoinchain.com',
    path: "'/v1/address/' + address",
    satoshis: 'body[0].unconfirmed_transactions_count === 0 && Math.round(body[0].balance * 1e8)'
  },

  { name: 'biteasy',
    site: 'https://www.biteasy.com/',
    server: 'https://api.biteasy.com',
    path: "'/v2/btc/mainnet/addresses/' + address",
    satoshis: 'body.status === 200 && body.data.balance'
  },

  { name: 'Blockchain.info',
    site: 'https://blockchain.info/',
    server: 'https://blockchain.info',
    path: "'/address/' + address + '?format=json&limit=0'",
    satoshis: 'body.final_balance'
  },

  { name: 'BlockCypher',
    site: 'https://www.blockcypher.com/',
    server: 'https://api.blockcypher.com',
    path: "'/v1/btc/main/addrs/' + address + '/balance'",
    satoshis: 'body.final_balance'
  },

  { name: 'Blockonomics',
    site: 'https://www.blockonomics.co/',
    server: 'https://www.blockonomics.co',
    path: "'/api/balance'",
    payload: 'new Object({ addr: address })',
    satoshis: 'body.response[0].confirmed'
  },

  { name: 'blockr.io',
    site: 'https://blockr.io/',
    server: 'https://btc.blockr.io',
    path: "'/api/v1/address/info/' + address",
    satoshis: "body.status === 'success' && Math.round(body.data.balance * 1e8)"
  },

/* PLEASE DO NOT uncomment this. Bitmain has opted out (cf., Andy NIU)
  { name: 'BTC Chain',
    site: 'https://btc.com/',
    server: 'https://chain.api.btc.com',
    path: "'/v3/address/' + address",
    satoshis: 'body.err_no === 0 && body.data.balance'
  },
 */

  // transactions[] limited to at least one by API
  { name: 'Smartbit',
    site: 'https://www.smartbit.com.au',
    server: 'https://api.smartbit.com.au',
    path: "'/v1/blockchain/address/' + address + '?limit=1'",
    satoshis: 'body.success === true && body.address.confirmed.balance_int'
  },

  // txs[] always returned by API
  { name: 'SoChain',
    site: 'https://chain.so/',
    server: 'https://chain.so',
    path: "'/api/v2/address/BTC/' + address",
    satoshis: "body.status === 'success' && Math.round(body.data.balance * 1e8)"
  }
]

var getBalance = function (address, options, callback) {
  var entries

  if (typeof 'options' === 'function') {
    callback = options
    options = {}
  }

  providers.forEach(function (provider) { if (typeof provider.score === 'undefined') provider.score = 0 })
  entries = underscore.sortBy(underscore.shuffle(providers), function (provider) { return provider.score })

  var e = function (provider, field) {
    var result = datax.evaluate(provider[field], { address: address })

    if (result) return result

    provider.score = -1001
    callback(new Error('provider ' + provider.name + ' has invalid ' + field + ' field: ' + provider[field]), provider)
  }

  var f = function (i) {
    var now, params, provider

    if (i === 0) {
      if (!options.allP) callback(new Error('no providers available'))
      return
    }

    provider = entries[--i]
    if (provider.score < -1000) return f(i)

    params = underscore.defaults(underscore.pick(provider, [ 'server', 'method' ]), underscore.pick(options, [ 'timeout' ]))
    params.path = e(provider, 'path')
    if (!params.path) return f(i)

    if (provider.payload) {
      params.payload = e(provider, 'payload')
      if (!params.payload) return f(i)
    }

    now = underscore.now()
    roundTrip(params, options, function (err, response, payload) {
      var result

      if (err) {
        provider.score = (err.toString() === 'Error: timeout') ? -500  // timeout
                           : (typeof err.code !== 'undefined') ? -350  // DNS, etc.
                           : -750                                      // HTTP response error
      } else {
        result = datax.evaluate(provider.satoshis, { body: payload })
        if (typeof result === 'number') {
          provider.score = Math.max(5000 - (underscore.now() - now), -250)
          callback(null, provider, result)
          if (options.allP) return f(i)
          return
        }

        err = new Error('provider ' + provider.name + ' has invalid satoshis field [' + provider.satoshis + '] for ' +
                        JSON.stringify(payload))
        provider.score = -1001
      }

      callback(err, provider)
      f(i)
    })
  }

  f(entries.length)
}

var roundTrip = function (params, options, callback) {
  var request, timeoutP
  var parts = url.parse(params.server)
  var client = parts.protocol === 'https:' ? https : http

  params = underscore.defaults(underscore.extend(underscore.pick(parts, 'protocol', 'hostname', 'port'), params),
                               { method: params.payload ? 'POST' : 'GET' })
  if (options.debugP) console.log('\nparams=' + JSON.stringify(params, null, 2))

  request = client.request(underscore.omit(params, [ 'payload', 'timeout' ]), function (response) {
    var body = ''

    if (timeoutP) return
    response.on('data', function (chunk) {
      body += chunk.toString()
    }).on('end', function () {
      var payload

      if (params.timeout) request.setTimeout(0)

      if (options.verboseP) {
        console.log('>>> HTTP/' + response.httpVersionMajor + '.' + response.httpVersionMinor + ' ' + response.statusCode +
                   ' ' + (response.statusMessage || ''))
      }
      if (Math.floor(response.statusCode / 100) !== 2) return callback(new Error('HTTP response ' + response.statusCode))

      try {
        payload = (response.statusCode !== 204) ? JSON.parse(body) : null
      } catch (err) {
        return callback(err)
      }
      if (options.verboseP) console.log('>>> ' + JSON.stringify(payload, null, 2).split('\n').join('\n>>> '))

      try {
        callback(null, response, payload)
      } catch (err0) {
        if (options.verboseP) console.log('callback: ' + err0.tostring() + '\n' + err0.stack)
      }
    }).setEncoding('utf8')
  }).on('error', function (err) {
    callback(err)
  }).on('timeout', function () {
    timeoutP = true
    callback(new Error('timeout'))
  })
  if (params.payload) request.write(JSON.stringify(params.payload))
  request.end()
  if (params.timeout) request.setTimeout(params.timeout)

  if (!options.verboseP) return

  console.log('<<< ' + params.method + ' ' + params.path)
  if (params.payload) console.log('<<< ' + JSON.stringify(params.payload, null, 2).split('\n').join('\n<<< '))
}

module.exports = {
  getBalance: getBalance,
  providers: providers,
  schema: schema,
  roundTrip: roundTrip
}

var validity = Joi.validate(providers, schema)
if (validity.error) throw new Error(validity.error)
