/**
 * ----------------------------------------------------------
 * Storefront App Default Configurations
 * ----------------------------------------------------------
 *
 * Overwritable configurations.
 *
 * !!! Do not touch this file unless you know what you're doing.
 *
 * @type {object}
 */
const DefaultConfig = {
    AppConfig: {
        linkingPrefixes: [],
        enableTranslations: false,
        enabledTranslations: []
    },

    InterfaceConfig: {
        storefront: {
            defaultHeaderComponent: 'ui/headers/StorefrontHeader',
        },

        network: {
            defaultHeaderComponent: 'ui/headers/NetworkHeader',
            exploreScreen: {
                defaultCategoryComponent: 'ui/NetworkCategoryBlock',
                defaultCategoryComponentProps: {
                    containerStyle: {},
                },
            },
        },

        accountScreen: {
            containerStyle: {},
            signedInContainerStyle: {},
            signedOutContainerStyle: {},
            headerContainerStyle: {},
            signedInHeaderContainerStyle: {},
            signedOutHeaderContainerStyle: {},
            headerComponentProps: {},
            displayHeaderComponent: true,
            displayEmptyStatePlaceholder: true,
            emptyStatePlaceholderContainerStyle: {},
            emptyStatePlaceholderIconContainerStyle: {},
            emptyStatePlaceholderIconStyle: {},
            emptyStatePlaceholderTextStyle: {},
            actionButtonsContainerStyle: {},
            loginButtonStyle: {},
            loginButtonTextStyle: {},
            createAccountButtonStyle: {},
            createAccountButtonTextStyle: {},
            signedOutContainerBackgroundImage: null,
            signedInContainerBackgroundImage: null,
            signedInContainerBackgroundImageStyle: {},
            signedOutContainerBackgroundImageStyle: {},
            signedInBackgroundResizeMode: 'cover',
            signedOutBackgroundResizeMode: 'cover'
        }
    },
};

const configure = (target, ...sources) => {
    const isObject = (item) => item && typeof item === 'object' && !Array.isArray(item);

    if (typeof target === 'string') {
        target = DefaultConfig[target];
    }

    if (!sources.length) {
        return target;
    }

    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) {
                    Object.assign(target, { [key]: {} });
                }

                configure(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return configure(target, ...sources);
};

export { configure };
export default DefaultConfig;