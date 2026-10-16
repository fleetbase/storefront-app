import React from 'react';
import SignInScreen from './SignInScreen';

/** Add a phone number to the signed-in account: enter it, then verify the SMS code. */
const AddPhoneScreen = (props: any) => <SignInScreen {...props} mode='phone' />;

export default AddPhoneScreen;
