import { configure } from './defaults';
import { tailwind } from '../src/tailwind';

/** 
 * ----------------------------------------------------------
 * Storefront App Interface Configuration
 * ----------------------------------------------------------
 *
 * Allows users to set their own component and interface 
 * options here. Customize headers, category panels, and
 * feature screens.
 *
 * @type {object} 
 */
const InterfaceConfig = configure('InterfaceConfig', {
    accountScreen: {
        containerStyle: tailwind('bg-transparent'),
        displaySignedOutHeaderComponent: false,
        displayEmptyStatePlaceholder: false,
        actionButtonsContainerStyle: tailwind('absolute w-full bottom-0 left-0 right-0 pb-28 -mt-2'),
        loginButtonStyle: tailwind('shadow-lg'),
        createAccountButtonStyle: tailwind('shadow-lg'),
        signedOutContainerBackgroundImage: require('../assets/emeel-login-bg.png'),
        signedOutBackgroundResizeMode: 'cover'
    }
});

export default InterfaceConfig;