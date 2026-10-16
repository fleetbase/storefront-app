import React from 'react';
import SignInScreen from './SignInScreen';

/** Sign up: the sign-in screen with a name field, sending an account creation code. */
const CreateAccountScreen = (props: any) => <SignInScreen {...props} mode='create' />;

export default CreateAccountScreen;
