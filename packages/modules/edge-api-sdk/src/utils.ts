export const getEnvRegion = () => {
  const region = process.env.AWS_REGION
  if (!region) {
    throw new Error('No AWS_REGION specified')
  }

  return {
    region,
  }
}

export const sessionIdHeaderName = 'x-edge-api-session-id'
