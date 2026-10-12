// Native Google Sign-In has no web implementation, and its package fails to load in the
// web bundle. The web build hides the Google button; this keeps imports working.
const unsupported = () => Promise.reject(new Error('Google Sign-In is not available on the web.'));

export const GoogleSignin = {
    configure() {},
    hasPlayServices: () => Promise.resolve(false),
    signIn: unsupported,
    signInSilently: unsupported,
    signOut: () => Promise.resolve(null),
    revokeAccess: () => Promise.resolve(null),
    getCurrentUser: () => null,
    hasPreviousSignIn: () => false,
};

export const statusCodes = { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED', IN_PROGRESS: 'IN_PROGRESS', PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE' };

export default { GoogleSignin, statusCodes };
