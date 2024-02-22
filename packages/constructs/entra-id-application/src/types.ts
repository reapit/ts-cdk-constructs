export interface Entity {
  // The unique idenfier for an entity. Read-only.
  id?: string;
}
export interface DirectoryObject extends Entity {
  // Date and time when this object was deleted. Always null when the object hasn't been deleted.
  deletedDateTime?: NullableOption<string>;
}
export interface Application extends DirectoryObject {
  /**
   * Defines custom behavior that a consuming service can use to call an app in specific contexts. For example, applications
   * that can render file streams may set the addIns property for its 'FileHandler' functionality. This will let services
   * like Office 365 call the application in the context of a document the user is working on.
   */
  addIns?: AddIn[];
  // Specifies settings for an application that implements a web API.
  api?: NullableOption<ApiApplication>;
  /**
   * The unique identifier for the application that is assigned to an application by Azure AD. Not nullable. Read-only.
   * Supports $filter (eq).
   */
  appId?: NullableOption<string>;
  // Unique identifier of the applicationTemplate. Supports $filter (eq, not, ne).
  applicationTemplateId?: NullableOption<string>;
  /**
   * The collection of roles defined for the application. With app role assignments, these roles can be assigned to users,
   * groups, or service principals associated with other applications. Not nullable.
   */
  appRoles?: AppRole[];
  // Specifies the certification status of the application.
  certification?: NullableOption<Certification>;
  /**
   * The date and time the application was registered. The DateTimeOffset type represents date and time information using
   * ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.
   * Supports $filter (eq, ne, not, ge, le, in, and eq on null values) and $orderBy.
   */
  createdDateTime?: NullableOption<string>;
  defaultRedirectUri?: NullableOption<string>;
  /**
   * Free text field to provide a description of the application object to end users. The maximum allowed size is 1024
   * characters. Supports $filter (eq, ne, not, ge, le, startsWith) and $search.
   */
  description?: NullableOption<string>;
  /**
   * Specifies whether Microsoft has disabled the registered application. Possible values are: null (default value),
   * NotDisabled, and DisabledDueToViolationOfServicesAgreement (reasons may include suspicious, abusive, or malicious
   * activity, or a violation of the Microsoft Services Agreement). Supports $filter (eq, ne, not).
   */
  disabledByMicrosoftStatus?: NullableOption<string>;
  /**
   * The display name for the application. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values),
   * $search, and $orderBy.
   */
  displayName?: NullableOption<string>;
  /**
   * Configures the groups claim issued in a user or OAuth 2.0 access token that the application expects. To set this
   * attribute, use one of the following valid string values: None, SecurityGroup (for security groups and Azure AD roles),
   * All (this gets all of the security groups, distribution groups, and Azure AD directory roles that the signed-in user is
   * a member of).
   */
  groupMembershipClaims?: NullableOption<string>;
  /**
   * Also known as App ID URI, this value is set when an application is used as a resource app. The identifierUris acts as
   * the prefix for the scopes you'll reference in your API's code, and it must be globally unique. You can use the default
   * value provided, which is in the form api://&amp;lt;application-client-id&amp;gt;, or specify a more readable URI like
   * https://contoso.com/api. For more information on valid identifierUris patterns and best practices, see Azure AD
   * application registration security best practices. Not nullable. Supports $filter (eq, ne, ge, le, startsWith).
   */
  identifierUris?: string[];
  /**
   * Basic profile information of the application such as app's marketing, support, terms of service and privacy statement
   * URLs. The terms of service and privacy statement are surfaced to users through the user consent experience. For more
   * info, see How to: Add Terms of service and privacy statement for registered Azure AD apps. Supports $filter (eq, ne,
   * not, ge, le, and eq on null values).
   */
  info?: NullableOption<InformationalUrl>;
  // Specifies whether this application supports device authentication without a user. The default is false.
  isDeviceOnlyAuthSupported?: NullableOption<boolean>;
  /**
   * Specifies the fallback application type as public client, such as an installed application running on a mobile device.
   * The default value is false which means the fallback application type is confidential client such as a web app. There
   * are certain scenarios where Azure AD cannot determine the client application type. For example, the ROPC flow where it
   * is configured without specifying a redirect URI. In those cases Azure AD interprets the application type based on the
   * value of this property.
   */
  isFallbackPublicClient?: NullableOption<boolean>;
  // The collection of key credentials associated with the application. Not nullable. Supports $filter (eq, not, ge, le).
  keyCredentials?: KeyCredential[];
  // The main logo for the application. Not nullable.
  logo?: any;
  // Notes relevant for the management of the application.
  notes?: NullableOption<string>;
  oauth2RequirePostResponse?: boolean;
  /**
   * Application developers can configure optional claims in their Azure AD applications to specify the claims that are sent
   * to their application by the Microsoft security token service. For more information, see How to: Provide optional claims
   * to your app.
   */
  optionalClaims?: NullableOption<OptionalClaims>;
  // Specifies parental control settings for an application.
  parentalControlSettings?: NullableOption<ParentalControlSettings>;
  // The collection of password credentials associated with the application. Not nullable.
  passwordCredentials?: PasswordCredential[];
  // Specifies settings for installed clients such as desktop or mobile devices.
  publicClient?: NullableOption<PublicClientApplication>;
  /**
   * The verified publisher domain for the application. Read-only. For more information, see How to: Configure an
   * application's publisher domain. Supports $filter (eq, ne, ge, le, startsWith).
   */
  publisherDomain?: NullableOption<string>;
  // Specifies whether this application requires Azure AD to verify the signed authentication requests.
  requestSignatureVerification?: NullableOption<RequestSignatureVerification>;
  /**
   * Specifies the resources that the application needs to access. This property also specifies the set of delegated
   * permissions and application roles that it needs for each of those resources. This configuration of access to the
   * required resources drives the consent experience. No more than 50 resource services (APIs) can be configured. Beginning
   * mid-October 2021, the total number of required permissions must not exceed 400. For more information, see Limits on
   * requested permissions per app. Not nullable. Supports $filter (eq, not, ge, le).
   */
  requiredResourceAccess?: RequiredResourceAccess[];
  /**
   * The URL where the service exposes SAML metadata for federation. This property is valid only for single-tenant
   * applications. Nullable.
   */
  samlMetadataUrl?: NullableOption<string>;
  // References application or service contact information from a Service or Asset Management database. Nullable.
  serviceManagementReference?: NullableOption<string>;
  /**
   * Specifies the Microsoft accounts that are supported for the current application. The possible values are: AzureADMyOrg,
   * AzureADMultipleOrgs, AzureADandPersonalMicrosoftAccount (default), and PersonalMicrosoftAccount. See more in the table.
   * The value of this object also limits the number of permissions an app can request. For more information, see Limits on
   * requested permissions per app. The value for this property has implications on other app object properties. As a
   * result, if you change this property, you may need to change other properties first. For more information, see
   * Validation differences for signInAudience.Supports $filter (eq, ne, not).
   */
  signInAudience?: NullableOption<string>;
  /**
   * Specifies settings for a single-page application, including sign out URLs and redirect URIs for authorization codes and
   * access tokens.
   */
  spa?: NullableOption<SpaApplication>;
  /**
   * Custom strings that can be used to categorize and identify the application. Not nullable. Strings added here will also
   * appear in the tags property of any associated service principals.Supports $filter (eq, not, ge, le, startsWith) and
   * $search.
   */
  tags?: string[];
  /**
   * Specifies the keyId of a public key from the keyCredentials collection. When configured, Azure AD encrypts all the
   * tokens it emits by using the key this property points to. The application code that receives the encrypted token must
   * use the matching private key to decrypt the token before it can be used for the signed-in user.
   */
  tokenEncryptionKeyId?: NullableOption<string>;
  /**
   * Specifies the verified publisher of the application. For more information about how publisher verification helps
   * support application security, trustworthiness, and compliance, see Publisher verification.
   */
  verifiedPublisher?: NullableOption<VerifiedPublisher>;
  // Specifies settings for a web application.
  web?: NullableOption<WebApplication>;
  // The appManagementPolicy applied to this application.
  appManagementPolicies?: NullableOption<AppManagementPolicy[]>;
  // Supports $filter (/$count eq 0, /$count ne 0). Read-only.
  createdOnBehalfOf?: NullableOption<DirectoryObject>;
  // Read-only. Nullable. Supports $expand and $filter (/$count eq 0, /$count ne 0).
  extensionProperties?: NullableOption<ExtensionProperty[]>;
  // Federated identities for applications. Supports $expand and $filter (startsWith, /$count eq 0, /$count ne 0).
  federatedIdentityCredentials?: NullableOption<FederatedIdentityCredential[]>;
  homeRealmDiscoveryPolicies?: NullableOption<HomeRealmDiscoveryPolicy[]>;
  /**
   * Directory objects that are owners of the application. Read-only. Nullable. Supports $expand and $filter (/$count eq 0,
   * /$count ne 0, /$count eq 1, /$count ne 1).
   */
  owners?: NullableOption<DirectoryObject[]>;
  tokenIssuancePolicies?: NullableOption<TokenIssuancePolicy[]>;
  tokenLifetimePolicies?: NullableOption<TokenLifetimePolicy[]>;
  /**
   * Represents the capability for Azure Active Directory (Azure AD) identity synchronization through the Microsoft Graph
   * API.
   */
  synchronization?: NullableOption<Synchronization>;
}