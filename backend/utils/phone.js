const normalizePhoneNumber = (value, defaultCountryCode = process.env.MCUBE_DEFAULT_COUNTRY_CODE || "91") => {
  const digits = String(value || "").replace(/\D/g, "")
  const countryCode = String(defaultCountryCode || "").replace(/\D/g, "")

  if (!digits) return ""
  if (countryCode && digits.length === 10) return `${countryCode}${digits}`
  if (countryCode && digits.length === 11 && digits.startsWith("0")) return `${countryCode}${digits.slice(1)}`
  return digits
}

const lastNDigits = (value, count = 10) => normalizePhoneNumber(value).slice(-count)

const samePhoneNumber = (first, second) => {
  const firstDigits = normalizePhoneNumber(first)
  const secondDigits = normalizePhoneNumber(second)
  if (!firstDigits || !secondDigits) return false
  return firstDigits === secondDigits || lastNDigits(firstDigits) === lastNDigits(secondDigits)
}

module.exports = {
  normalizePhoneNumber,
  lastNDigits,
  samePhoneNumber,
}
