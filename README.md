# ledger-balance
Find the balance associated with a Bitcoin wallet.
Do so using a list of blockchain reporters (providers) that is weighted over time.

## API

### Get the Balance of a Bitcoin wallet

        var getBalance = require('ledger-balance').getBalance

        var address = '3...'
        getBalance(address, function (err, provider, result) {
          if (err) return console.log((provider ? (provider.name + ': ') : '') + err.toString())

          console.log('address=' + address + ' provider=' + provider.name + ' satoshis=' + result)
        })

### Add to the list of Providers

Each of these properties is mandatory:

        require('ledger-balance').providers.push({ name     : 'commonly-known name of provider'
                                                 , site     : 'https://example.com/'
                                                 , server   : 'https://api.example.com'
                                                 , path     : '"/v1/address" + address'
                                                 , satoshis : 'body.confirmed_satoshis'
                                                 })

The default value for the `method` is `"GET"`;
(or `"POST"` if the value for the `payload` property is present).

Both the mandatory `path` property and the optional `payload` property are evaluated with this context:

        { address: '3...' }

The mandatory `satoshis` property is evaluated with this context:

        { body: JSON.parse(HTTP_response_body) }

## Finally...

All of the blockchain reporters in this package are available using public APIs without any API key.

If you want to have your blockchain reporter added to the package,
please send an email to [Brave Software](mailto:devops@brave.com?subject=ledger-balance).

If you want to have your blockchain reporter removed from the package,
also send an [email](mailto:devops@brave.com?subject=ledger-balance).

Enjoy!
