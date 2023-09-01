const phoneNumberFormatter = function (number) {
  let formatted = number.replace(/\D/g, '')

  if (!formatted.endsWith('@c.us')) {
    formatted += '@c.us'
  }

  return formatted
}

module.exports = {
  phoneNumberFormatter,
}
