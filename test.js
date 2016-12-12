var addresses = [
  '3KFFjMuLcHiPoV5bzpo3FHD7vwMhZd8CXe'
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
