## Salesforce B2C Commerce Google Authentication
The Salesforce B2C Commerce - Google Authentication code is a Custom (OAuthReentryAmazon - Pipeline Name) function that facilitates the integration between Google Login OAuth2 Authentication with SFRA Storefront and obtains information about the customer & Registers it

## Getting Started
- Add the function in Login Controller file (login.js).
- Login to Commerce Cloud > Select Site > Administration >  Global Preferences >  OAuth2 Providers (Create a new Google using template) and change the following fields :-

|Fields  | Value  |
| :------------ | :------------ |
|Authorization URL  | **`https://www.amazon.com/ap/oa`**  |
|Token URL| **`https://api.amazon.com/auth/o2/token`**  |
|User Info URL  | **`https://api.amazon.com/user/profile`** |
|User Info URL Access Token Name:| **`access_token`**  |
|Redirect Pipeline Name| **`OAuthReentryGooglePlus`**  |

### Commands
1. `SFCC-CI auth:login`
2. `Run npm run uploadCartridge`

##Version Requirements
- **SFRA** > 5.3
- **B2C** > 21.5>
