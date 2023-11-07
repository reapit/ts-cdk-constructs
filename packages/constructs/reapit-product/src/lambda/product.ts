import { createSignedFetcher } from 'aws-sigv4-fetch'
import { randomUUID } from 'crypto'
import { CreateProductModel, ProductModel } from '@reapit/foundations-ts-definitions/types/organisations-schema'
const headers = {
  'content-type': 'application/json',
  'api-version': 'latest',
}

const baseUrl = process.env.ORGANISATIONS_SERVICE_URL

if (!baseUrl) {
  throw new Error('missing env ORGANISATIONS_SERVICE_URL')
}

const region = process.env.AWS_REGION
if (!region) {
  throw new Error('missing env AWS_REGION')
}

const signedFetch = createSignedFetcher({
  service: 'execute-api',
  region,
})

export type CreateProduct = Omit<CreateProductModel, 'id'>

export const createProduct = async (product: CreateProduct): Promise<ProductModel> => {
  const id = randomUUID()
  const res = await signedFetch(`${baseUrl}/Products`, {
    method: 'post',
    body: JSON.stringify({
      ...product,
      id,
    }),
    headers,
  })
  if (!res.ok) {
    console.error(await res.text())
    throw new Error('failed to create product')
  }
  const productId = res.headers.get('location')?.split('/').pop()
  if (!productId) {
    throw new Error('no product id returned in location header')
  }
  const productObj = await getProduct(productId)
  if (!productObj) {
    throw new Error(`Failed to get created product with id ${productId}`)
  }
  return productObj
}

export const getProduct = async (productId: string): Promise<ProductModel | undefined> => {
  const res = await signedFetch(`${baseUrl}/Products/${productId}`, {
    method: 'get',
    headers,
  })
  if (res.ok) {
    const resp = await res.json()
    return resp
  }
  if (res.status === 404) {
    return undefined
  }
  console.error(await res.text())
  throw new Error(`Orgs service responded with status code ${res.status}`)
}

export const deleteProduct = async (productId: string) => {
  const res = await signedFetch(`${baseUrl}/Products/${productId}`, {
    method: 'delete',
    headers,
  })
  if (res.ok) {
    return
  }
  console.error(await res.text())
  throw new Error(`Orgs service responded with status code ${res.status}`)
}

export const updateProduct = async (id: string, product: CreateProduct) => {
  const res = await signedFetch(`${baseUrl}/Products`, {
    method: 'post',
    body: JSON.stringify({
      ...product,
      id,
    }),
    headers,
  })
  if (!res.ok) {
    throw new Error('failed to create product')
  }
  return getProduct(id)
}
