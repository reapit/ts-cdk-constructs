import { Application } from '@microsoft/microsoft-graph-types'
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'
import { client } from './entra-sdk-client'

const createEntraApp = async (app: Application) => {
  const res = await client.api('/applications').post(app)
  return res as Application
}

const updateEntraApp = async (appId: string, app: Application) => {
  const res = await client.api(`/applications(appId='${appId}')`).patch(app)
  return res as Application
}

const deleteEntraApp = async (appId: string) => {
  await client.api(`/applications(appId='${appId}')`).delete()
}

export const onEvent = customResourceWrapper({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCreate: async ({ requestId, serviceToken, ...appProps }) => {
    const app = await createEntraApp(appProps)
    if (!app.appId) {
      throw new Error('no appId present on created app')
    }
    return {
      ...app,
      physicalResourceId: app.appId,
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdate: async ({ requestId, serviceToken, physicalResourceId, ...appProps }, oldProps) => {
    if (!physicalResourceId) {
      throw new Error('no physicalResourceId present on event')
    }
    return updateEntraApp(physicalResourceId, appProps)
  },
  onDelete: ({ physicalResourceId }) => {
    if (!physicalResourceId) {
      throw new Error('no physicalResourceId present on event')
    }
    return deleteEntraApp(physicalResourceId)
  },
})
