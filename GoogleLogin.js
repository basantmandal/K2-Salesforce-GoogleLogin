/**
 * Google Login - Using Salesforce Reference Architecture
 * Copyright (c) 2021 Basant Mandal, https://wwww.techbasant.in
 * GoogleLogin.js is open sourced under the MIT license.
 * https://github.com/basantmandal/K2-Salesforce-GoogleLogin
 */

/**
 *
 * ++++++++++++++++++ SETTINGS +++++++++++++++++++++
 * Authorization URL :- https://accounts.google.com/o/oauth2/auth
 * Token URL :- https://accounts.google.com/o/oauth2/token
 * User Info URL:- https://www.googleapis.com/oauth2/v3/userinfo
 * User Info URL Access Token Name:- access_token
 * Redirect Pipeline Name - OAuthReentryGooglePlus
 * ++++++++++++++++++++++++++++++++++++++++++++++++
 */
server.get('OAuthReentryGooglePlus', server.middleware.https, consentTracking.consent, function (req, res, next) {
  var URLUtils          = require('dw/web/URLUtils');
  var oauthLoginFlowMgr = require('dw/customer/oauth/OAuthLoginFlowMgr');
  var CustomerMgr       = require('dw/customer/CustomerMgr');
  var Transaction       = require('dw/system/Transaction');
  var Resource          = require('dw/web/Resource');

  var destination              = req.session.privacyCache.store.oauthLoginTargetEndPoint;
  var finalizeOAuthLoginResult = oauthLoginFlowMgr.finalizeOAuthLogin();

  if (!finalizeOAuthLoginResult) {
    res.redirect(URLUtils.url('Login-Show'));
    return next();
  }

  var response        = finalizeOAuthLoginResult.userInfoResponse.userInfo;
  var oauthProviderID = finalizeOAuthLoginResult.accessTokenResponse.oauthProviderId;

  if (!oauthProviderID) {
    res.render('/error', {
      error_message: 'Access Token Error',
      message: Resource.msg('error.oauth.login.failure', 'login', null)
    });
    return next();
  }

  var accessToken = finalizeOAuthLoginResult.accessTokenResponse.accessToken;

  if (!response) {
    res.render('/error', {
      error_message: 'No Response - Please Check - User Info URL',
      message: Resource.msg('error.oauth.login.failure', 'login', null)
    });
    return next();
  }

  var externalProfile = JSON.parse(response);
  if (!externalProfile) {

    res.json({
      error_message: 'Profile Empty Data - Google Permission Issue',
      externalProfile: JSON.stringify(externalProfile),
    });

    return next();
  }

  // BUG - Google Sends sub
  var userID = externalProfile.id || externalProfile.sub;
  if (!userID) {

    res.render('/error', {
      message2: 'User ID Error - Please Check - User Info URL & Token',
      message: Resource.msg('error.oauth.login.failure', 'login', null)
    });

    return next();
  }

  var authenticatedCustomerProfile = CustomerMgr.getExternallyAuthenticatedCustomerProfile(oauthProviderID, userID);

  if (!authenticatedCustomerProfile) {
    // Lets Create new profile
    Transaction.wrap(function () {
      var newCustomer = CustomerMgr.createExternallyAuthenticatedCustomer(oauthProviderID, userID);

      authenticatedCustomerProfile = newCustomer.getProfile();
      var firstName;
      var lastName;
      var email;

      // Google comes with a 'name' property that holds first and last name.
      if (typeof externalProfile.name === 'object') {
        firstName = externalProfile.name.givenName;
        lastName  = externalProfile.name.familyName;
      } else {
        firstName = externalProfile['first-name']
                    || externalProfile.first_name
                    || externalProfile.name;

        lastName = externalProfile['last-name']
                   || externalProfile.last_name
                   || externalProfile.name;
      }

      email = externalProfile['email-address'] || externalProfile.email;

      if (!email) {
        var emails = externalProfile.emails;

        if (emails && emails.length) {
          email = externalProfile.emails[0].value;
        }
      }

      authenticatedCustomerProfile.setFirstName(firstName);
      authenticatedCustomerProfile.setLastName(lastName);
      authenticatedCustomerProfile.setEmail(email);
    });
  }

  var credentials = authenticatedCustomerProfile.getCredentials();
  if (credentials.isEnabled()) {
    Transaction.wrap(function () {
      CustomerMgr.loginExternallyAuthenticatedCustomer(oauthProviderID, userID, false);
    });
  } else {

    res.render('/error', {
      message: Resource.msg('error.oauth.login.failure', 'login', null)
    });

    return next();
  }

  req.session.privacyCache.clear();
  res.redirect(URLUtils.url(destination));
  return next();
});
