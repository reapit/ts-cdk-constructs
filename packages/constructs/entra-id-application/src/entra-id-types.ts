/* eslint-disable max-len */
export interface Entity {
  // The unique idenfier for an entity. Read-only.
  readonly id?: string
}

export interface DirectoryObject extends Entity {
  // Date and time when this object was deleted. Always null when the object hasn't been deleted.
  readonly deletedDateTime?: string
}

export interface Application extends DirectoryObject {
  /**
   * Defines custom behavior that a consuming service can use to call an app in specific contexts. For example, applications
   * that can render file streams may set the addIns property for its 'FileHandler' functionality. This will let services
   * like Office 365 call the application in the context of a document the user is working on.
   */
  readonly addIns?: any[]
  // Specifies settings for an application that implements a web API.
  readonly api?: any
  /**
   * The unique identifier for the application that is assigned to an application by Azure AD. Not nullable. Read-only.
   * Supports $filter (eq).
   */
  readonly appId?: string
  // Unique identifier of the applicationTemplate. Supports $filter (eq, not, ne).
  readonly applicationTemplateId?: string
  /**
   * The collection of roles defined for the application. With app role assignments, these roles can be assigned to users,
   * groups, or service principals associated with other applications. Not nullable.
   */
  readonly appRoles?: any[]
  // Specifies the certification status of the application.
  readonly certification?: any
  /**
   * The date and time the application was registered. The DateTimeOffset type represents date and time information using
   * ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.
   * Supports $filter (eq, ne, not, ge, le, in, and eq on null values) and $orderBy.
   */
  readonly createdDateTime?: string
  readonly defaultRedirectUri?: string
  /**
   * Free text field to provide a description of the application object to end users. The maximum allowed size is 1024
   * characters. Supports $filter (eq, ne, not, ge, le, startsWith) and $search.
   */
  readonly description?: string
  /**
   * Specifies whether Microsoft has disabled the registered application. Possible values are: null (default value),
   * NotDisabled, and DisabledDueToViolationOfServicesAgreement (reasons may include suspicious, abusive, or malicious
   * activity, or a violation of the Microsoft Services Agreement). Supports $filter (eq, ne, not).
   */
  readonly disabledByMicrosoftStatus?: string
  /**
   * The display name for the application. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values),
   * $search, and $orderBy.
   */
  readonly displayName?: string
  /**
   * Configures the groups claim issued in a user or OAuth 2.0 access token that the application expects. To set this
   * attribute, use one of the following valid string values: None, SecurityGroup (for security groups and Azure AD roles),
   * All (this gets all of the security groups, distribution groups, and Azure AD directory roles that the signed-in user is
   * a member of).
   */
  readonly groupMembershipClaims?: string
  /**
   * Also known as App ID URI, this value is set when an application is used as a resource app. The identifierUris acts as
   * the prefix for the scopes you'll reference in your API's code, and it must be globally unique. You can use the default
   * value provided, which is in the form api://&amp;lt;application-client-id&amp;gt;, or specify a more readable URI like
   * https://contoso.com/api. For more information on valid identifierUris patterns and best practices, see Azure AD
   * application registration security best practices. Not nullable. Supports $filter (eq, ne, ge, le, startsWith).
   */
  readonly identifierUris?: string[]
  /**
   * Basic profile information of the application such as app's marketing, support, terms of service and privacy statement
   * URLs. The terms of service and privacy statement are surfaced to users through the user consent experience. For more
   * info, see How to: Add Terms of service and privacy statement for registered Azure AD apps. Supports $filter (eq, ne,
   * not, ge, le, and eq on null values).
   */
  readonly info?: any
  // Specifies whether this application supports device authentication without a user. The default is false.
  readonly isDeviceOnlyAuthSupported?: boolean
  /**
   * Specifies the fallback application type as public client, such as an installed application running on a mobile device.
   * The default value is false which means the fallback application type is confidential client such as a web app. There
   * are certain scenarios where Azure AD cannot determine the client application type. For example, the ROPC flow where it
   * is configured without specifying a redirect URI. In those cases Azure AD interprets the application type based on the
   * value of this property.
   */
  readonly isFallbackPublicClient?: boolean
  // The collection of key credentials associated with the application. Not nullable. Supports $filter (eq, not, ge, le).
  readonly keyCredentials?: any[]
  // The main logo for the application. Not nullable.
  readonly logo?: any
  // Notes relevant for the management of the application.
  readonly notes?: string
  readonly oauth2RequirePostResponse?: boolean
  /**
   * Application developers can configure optional claims in their Azure AD applications to specify the claims that are sent
   * to their application by the Microsoft security token service. For more information, see How to: Provide optional claims
   * to your app.
   */
  readonly optionalClaims?: any
  // Specifies parental control settings for an application.
  readonly parentalControlSettings?: any
  // The collection of password credentials associated with the application. Not nullable.
  readonly passwordCredentials?: any[]
  // Specifies settings for installed clients such as desktop or mobile devices.
  readonly publicClient?: any
  /**
   * The verified publisher domain for the application. Read-only. For more information, see How to: Configure an
   * application's publisher domain. Supports $filter (eq, ne, ge, le, startsWith).
   */
  readonly publisherDomain?: string
  // Specifies whether this application requires Azure AD to verify the signed authentication requests.
  readonly requestSignatureVerification?: any
  /**
   * Specifies the resources that the application needs to access. This property also specifies the set of delegated
   * permissions and application roles that it needs for each of those resources. This configuration of access to the
   * required resources drives the consent experience. No more than 50 resource services (APIs) can be configured. Beginning
   * mid-October 2021, the total number of required permissions must not exceed 400. For more information, see Limits on
   * requested permissions per app. Not nullable. Supports $filter (eq, not, ge, le).
   */
  readonly requiredResourceAccess?: any[]
  /**
   * The URL where the service exposes SAML metadata for federation. This property is valid only for single-tenant
   * applications. Nullable.
   */
  readonly samlMetadataUrl?: string
  // References application or service contact information from a Service or Asset Management database. Nullable.
  readonly serviceManagementReference?: string
  /**
   * Specifies the Microsoft accounts that are supported for the current application. The possible values are: AzureADMyOrg,
   * AzureADMultipleOrgs, AzureADandPersonalMicrosoftAccount (default), and PersonalMicrosoftAccount. See more in the table.
   * The value of this object also limits the number of permissions an app can request. For more information, see Limits on
   * requested permissions per app. The value for this property has implications on other app object properties. As a
   * result, if you change this property, you may need to change other properties first. For more information, see
   * Validation differences for signInAudience.Supports $filter (eq, ne, not).
   */
  readonly signInAudience?: string
  /**
   * Specifies settings for a single-page application, including sign out URLs and redirect URIs for authorization codes and
   * access tokens.
   */
  readonly spa?: any
  /**
   * Custom strings that can be used to categorize and identify the application. Not nullable. Strings added here will also
   * appear in the tags property of any associated service principals.Supports $filter (eq, not, ge, le, startsWith) and
   * $search.
   */
  readonly tags?: string[]
  /**
   * Specifies the keyId of a public key from the keyCredentials collection. When configured, Azure AD encrypts all the
   * tokens it emits by using the key this property points to. The application code that receives the encrypted token must
   * use the matching private key to decrypt the token before it can be used for the signed-in user.
   */
  readonly tokenEncryptionKeyId?: string
  /**
   * Specifies the verified publisher of the application. For more information about how publisher verification helps
   * support application security, trustworthiness, and compliance, see Publisher verification.
   */
  readonly verifiedPublisher?: any
  // Specifies settings for a web application.
  readonly web?: any
  // The appManagementPolicy applied to this application.
  readonly appManagementPolicies?: any[]
  // Supports $filter (/$count eq 0, /$count ne 0). Read-only.
  readonly createdOnBehalfOf?: DirectoryObject
  // Read-only. Nullable. Supports $expand and $filter (/$count eq 0, /$count ne 0).
  readonly extensionProperties?: any[]
  // Federated identities for applications. Supports $expand and $filter (startsWith, /$count eq 0, /$count ne 0).
  readonly federatedIdentityCredentials?: any[]
  readonly homeRealmDiscoveryPolicies?: any[]
  /**
   * Directory objects that are owners of the application. Read-only. Nullable. Supports $expand and $filter (/$count eq 0,
   * /$count ne 0, /$count eq 1, /$count ne 1).
   */
  readonly owners?: DirectoryObject[]
  readonly tokenIssuancePolicies?: any[]
  readonly tokenLifetimePolicies?: any[]
  /**
   * Represents the capability for Azure Active Directory (Azure AD) identity synchronization through the Microsoft Graph
   * API.
   */
  readonly synchronization?: any
}
