export const parseArn = (keyArn: string) => {
  const region = keyArn.split(':')[3]
  const account = keyArn.split(':')[4]
  const keyId = keyArn.split('key/')[1]

  return {
    region,
    account,
    keyId,
  }
}

export const strIsDefined = (str: string | undefined): str is string => !!str
