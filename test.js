var addresses = [
  '3PnrcAMkR7BfwkR1q3epPe2K52eYAZnu5s',
  '2N6YwaWJQG5aUPXsG4xiBdVz9ZyooAB7RLj'
]
addresses.forEach(function (address) {
  let ledgerBalance = require('.')

  ledgerBalance.getBalance(address, { allP: true, timeout: 1000 }, function (err, provider, result) {
    if (err) return console.log('address=' + address + ' provider=' + (provider || {}).name + ' ' + 'isTestnetAddress=' + ledgerBalance.isTestnetAddress(address) + ' ' + err.toString())

    console.log('address=' + address + ' provider=' + provider.name + ' balance=' + result + ' isTestnetAddress=' + ledgerBalance.isTestnetAddress(address))
  })
})
