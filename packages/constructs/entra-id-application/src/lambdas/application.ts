import { Application } from '@microsoft/microsoft-graph-types'
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'
import { client } from './entra-sdk-client'

const createEntraApp = async (app: Application) => {
  const res = await client.api('/applications').post(app)
  return res as Application
}

const updateEntraApp = async (id: string, app: Application) => {
  const res = await client.api(`/applications/${id}`).patch(app)
  return res as Application
}

const deleteEntraApp = async (id: string) => {
  await client.api(`/applications/${id}`).delete()
}

export const onEvent = customResourceWrapper({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCreate: async ({ requestId, serviceToken, ...appProps }) => {
    const app = await createEntraApp(appProps)
    return {
      ...app,
      physicalResourceId: app.id,
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdate: ({ requestId, serviceToken, physicalResourceId, ...appProps }) => {
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
