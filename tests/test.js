connectOptions.onNotAuthorized = function(responseObject) {
  // responseObject is:
  //  - undefined in case of simple password mismatch
  //  - populated with errorCode and errorMessage according to the thrown HookException
  console.log('Connection NOT authorized');

  if (!responseObject) {
    console.log('Authentication failure');
    // Here the actions to be taken for handling the authentication failure
    // because the password simply does not match
  } else {
    switch (responseObject.errorCode) {
      case 100:
        // Here the actions to be taken in case of attempt to manage a persistent session
        // without providing any credentials
        break;

      case 200:
        // Here the actions to be taken in case of no user found
        break;
    }
  }
};
