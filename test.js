var addresses = [
  '3PnrcAMkR7BfwkR1q3epPe2K52eYAZnu5s',
  '2N6YwaWJQG5aUPXsG4xiBdVz9ZyooAB7RLj'
]
var ledgerBalance = require('.')

addresses.forEach(function (address) {
  ledgerBalance.getBalance(address, { allP: true, timeout: 1000 }, function (err, provider, result) {
    if (err) {
      return console.log('address=' + address + ' provider=' + (provider || {}).name + ' ' +
                         'test=' + ledgerBalance.testnetAddressP(address) + ' ' + err.toString())
    }

    console.log('address=' + address + ' provider=' + provider.name + ' balance=' + JSON.stringify(result, null, 2) +
                ' test=' + ledgerBalance.testnetAddressP(address))
  })
})
