
/**
 * Model to create a new product
 */
export interface ReapitProduct {
  /**
   * The name of this group
   */
  readonly name: string
  /**
   * The grant type associated to the product (authorizationCode/clientCredentials)
   */
  readonly grant: string
  /**
   * A list of callback urls
   */
  readonly callbackUrls: string[]
  /**
   * A list of signout urls
   */
  readonly signoutUrls: string[]
  /**
   * A list of scopes to assign to the app
   */
  readonly scopes: string[]
  /**
   * Flag indicating whether or not the product has user admin capabilities
   * that require an additional scope to be set on the OAuth client
   */
  readonly requiresUserAdmin: boolean
  /**
   * A flag to determine if the app is for internal use only
   */
  readonly isInternalApp: boolean
}


/**
 * Representation of a product
 */
export interface ProductModel {
  /**
   * The unique identifier of the product
   */
  readonly id: string
  /**
   * The name of the product
   */
  readonly  name: string
  /**
   * The identifier of the product within the IDP
   */
  readonly externalId: string
  /**
   * The gateway usage keys identifier
   */
  readonly usageKeyId: string
  /**
   * The auth flow of the product (authorisationCode/clientCredentials)
   */
  readonly authFlow: string
  /**
   * The scopes the product has
   */
  readonly scopes: string[]
  /**
   * A flag to determine if the products app is for internal use only
   */
  readonly isInternalApp: boolean
  /**
   * The date and time when the product was created
   * example:
   * 2019-08-14T12:30:02.0000000Z
   */
  readonly created: string // date-time
}