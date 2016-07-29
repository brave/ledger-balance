var addresses = [
  '3PnrcAMkR7BfwkR1q3epPe2K52eYAZnu5s'
]
addresses.forEach(function (address) {
  require('.').getBalance(address, { allP: true, timeout: 500 }, function (err, provider, result) {
    if (err) return console.log('address=' + address + ' provider=' + provider.name + ' ' + err.toString())

    console.log('address=' + address + ' provider=' + provider.name + ' balance=' + result)
  })
})
