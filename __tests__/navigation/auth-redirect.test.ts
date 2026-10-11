import { setAuthRedirect, takeAuthRedirect } from '../../src/navigation/auth-redirect';

describe('auth redirect', () => {
    afterEach(() => setAuthRedirect(null));

    it('hands the destination over once', () => {
        setAuthRedirect({ route: 'StoreCartTab', params: { screen: 'Checkout' } });
        expect(takeAuthRedirect()).toEqual({ route: 'StoreCartTab', params: { screen: 'Checkout' } });
        expect(takeAuthRedirect()).toBeNull();
    });

    it('is empty until one is set, and a later one replaces it', () => {
        expect(takeAuthRedirect()).toBeNull();
        setAuthRedirect({ route: 'A' });
        setAuthRedirect({ route: 'B' });
        expect(takeAuthRedirect()).toEqual({ route: 'B' });
    });

    it('can be cleared', () => {
        setAuthRedirect({ route: 'A' });
        setAuthRedirect(null);
        expect(takeAuthRedirect()).toBeNull();
    });
});
