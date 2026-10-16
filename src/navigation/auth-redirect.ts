/**
 * Where to go after signing in. The sign-in screens live in the signed-out route group,
 * which unmounts the moment the customer is signed in, so the destination is kept here
 * rather than in their params.
 */
export type AuthRedirect = { route: string; params?: Record<string, any> };

let pending: AuthRedirect | null = null;

export function setAuthRedirect(redirect: AuthRedirect | null) {
    pending = redirect;
}

/** The pending destination, cleared as it is read. */
export function takeAuthRedirect(): AuthRedirect | null {
    const redirect = pending;
    pending = null;
    return redirect;
}
