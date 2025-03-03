import { useState, useEffect } from 'react';
import { authorize } from 'react-native-app-auth';
import { config, toBoolean } from '../utils';
// import { appleAuth } from '@invertase/react-native-apple-authentication';
import { toast } from '../utils/toast';
import useStorefront, { adapter } from '../hooks/use-storefront';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
// import { Settings as FacebookSDKSettings, LoginManager as FacebookLoginManager, Profile as FacebookProfile } from 'react-native-fbsdk-next';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const APP_LINK_PREFIX = config('APP_LINK_PREFIX');

const useOAuth = () => {
    const { storefront } = useStorefront();
    const { createCustomerSession } = useAuth();
    const [authState, setAuthState] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = async (provider) => {
        if (provider === 'apple') {
            const result = await appleLogin();
            setAuthState(result);
            return result;
        }

        if (provider === 'facebook') {
            const result = await facebookLogin();
            setAuthState(result);
            return result;
        }

        if (provider === 'google') {
            const result = await googleLogin();
            setAuthState(result);
            return result;
        }

        throw new Error('Invalid OAuth provider.');
    };

    const appleLogin = async () => {
        // setLoading(true);
        // setError(null);
        // try {
        //     if (!appleAuth.isSupported) {
        //         return toast.error('Apple Sign-In is not supported on this device');
        //     }
        //     // Perform Apple Sign-In
        //     const appleAuthResponse = await appleAuth.performRequest({
        //         requestedOperation: appleAuth.Operation.LOGIN,
        //         requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        //     });
        //     const { identityToken, authorizationCode, email, fullName, user: appleUserId } = appleAuthResponse;
        //     if (!identityToken || !authorizationCode) {
        //         const errorMessage = 'Apple Sign-In failed: Missing token or authorization code.';
        //         setError(errorMessage);
        //         setLoading(false);
        //         throw new Error(errorMessage);
        //         return;
        //     }
        //     // Get the user's name
        //     const name = fullName.givenName ?? fullName.nickname ?? fullName.familyName;
        //     // Login customer with apple credentials
        //     const customerJson = await storefront.customers.loginWithApple(appleUserId, identityToken, authorizationCode, email, name);
        //     const customer = createCustomerSession(customerJson);
        //     return customer;
        // } catch (err) {
        //     setError(err.message);
        //     setLoading(false);
        //     console.warn('Apple Sign-In error:', err);
        //     throw err;
        // } finally {
        //     setLoading(false);
        // }
    };

    const facebookLogin = async () => {
        // setLoading(true);
        // setError(null);
        // try {
        //     const currentProfile = await FacebookProfile.getCurrentProfile();
        //     if (currentProfile) {
        //         return authenticateWithFacebookProfile(currentProfile);
        //     }
        //     // Perform Facebook Sign-In
        //     const facebookAuthResponse = await FacebookLoginManager.logInWithPermissions(['public_profile']);
        //     if (facebookAuthResponse.isCancelled) {
        //         throw new Error('Facebook Sign-In was Canceled');
        //         console.warn('Facebook Sign-In was Canceled');
        //         return setLoading(false);
        //     }
        //     // Authenticate with Storefront
        //     const profile = await FacebookProfile.getCurrentProfile();
        //     if (profile) {
        //         const customer = await authenticateWithFacebookProfile(profile);
        //         return customer;
        //     }
        //     return facebookAuthResponse;
        // } catch (err) {
        //     setError(err.message);
        //     setLoading(false);
        //     console.warn('Facebook Sign-In error:', err);
        //     throw err;
        // } finally {
        //     setLoading(false);
        // }
    };

    const authenticateWithFacebookProfile = async (profile) => {
        try {
            const customerJson = await adapter.post('customers/login-with-facebook', {
                facebookUserId: profile.userID,
                email: profile.email,
                name: profile.name,
                avatarUrl: profile.imageURL,
            });

            const customer = createCustomerSession(customerJson);
            return customer;
        } catch (err) {
            console.warn(err.message);
            throw err;
        }
    };

    const googleLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            // Perform Google Sign-In
            await GoogleSignin.hasPlayServices();
            const googleAuthResponse = await GoogleSignin.signIn();

            const { idToken, user } = googleAuthResponse.data;
            const customerJson = await adapter.post('customers/login-with-google', {
                idToken,
                clientId: `${config('GOOGLE_CLIENT_ID')}.apps.googleusercontent.com`,
            });

            const customer = createCustomerSession(customerJson);
            return customer;
        } catch (err) {
            setError(err.message);
            setLoading(false);
            console.warn('Google Sign-In error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const loginSupported = (provider) => {
        if (provider === 'apple') {
            return appleAuth.isSupported && toBoolean(config('APPLE_LOGIN_ENABLED')) === true;
        }

        if (provider === 'google') {
            return typeof config('GOOGLE_CLIENT_ID') === 'string' && toBoolean(config('GOOGLE_LOGIN_ENABLED')) === true;
        }

        if (provider === 'facebook') {
            return typeof config('FACEBOOK_APP_ID') === 'string' && typeof config('FACEBOOK_CLIENT_TOKEN') === 'string' && toBoolean(config('FACEBOOK_LOGIN_ENABLED')) === true;
        }
    };

    // useEffect(() => {
    //     if (loginSupported('facebook')) {
    //         FacebookSDKSettings.setAppID(config('FACEBOOK_APP_ID'));
    //         FacebookSDKSettings.initializeSDK();
    //     }
    // }, []);

    useEffect(() => {
        if (loginSupported('google')) {
            GoogleSignin.configure({
                webClientId: `${config('GOOGLE_CLIENT_ID')}.apps.googleusercontent.com`,
                iosClientId: `${config('GOOGLE_IOS_CLIENT_ID')}.apps.googleusercontent.com`,
                offlineAccess: true,
            });
        }
    }, []);

    return {
        authState,
        loading,
        error,
        login,
        appleLogin,
        loginSupported,
        appleLoginIsSupported: loginSupported('apple'),
        googleLoginIsSupported: loginSupported('google'),
        facebookLoginIsSupported: loginSupported('facebook'),
    };
};

export default useOAuth;
