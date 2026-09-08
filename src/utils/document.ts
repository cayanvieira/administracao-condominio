const onlyDigits = (value: string): string => value.replace(/\D/g, '')

const hasRepeatedDigits = (value: string): boolean => /^([0-9])\1+$/.test(value)

const isValidCpf = (document: string): boolean => {
  if (document.length !== 11 || hasRepeatedDigits(document)) {
    return false
  }

  let firstDigit = 0
  for (let index = 0; index < 9; index += 1) {
    firstDigit += Number(document[index]) * (10 - index)
  }
  firstDigit = (firstDigit * 10) % 11
  if (firstDigit === 10) firstDigit = 0
  if (firstDigit !== Number(document[9])) return false

  let secondDigit = 0
  for (let index = 0; index < 10; index += 1) {
    secondDigit += Number(document[index]) * (11 - index)
  }
  secondDigit = (secondDigit * 10) % 11
  if (secondDigit === 10) secondDigit = 0

  return secondDigit === Number(document[10])
}

const isValidCnpj = (document: string): boolean => {
  if (document.length !== 14 || hasRepeatedDigits(document)) {
    return false
  }

  const calculateDigit = (length: number): number => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0

    for (let index = 0; index < length; index += 1) {
      sum += Number(document[index]) * weights[index]
    }

    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  return calculateDigit(12) === Number(document[12]) && calculateDigit(13) === Number(document[13])
}

export const normalizeDocument = (document: string): string => onlyDigits(document)

export const isValidCpfOrCnpj = (document: string): boolean => {
  const normalizedDocument = normalizeDocument(document)
  return isValidCpf(normalizedDocument) || isValidCnpj(normalizedDocument)
}
