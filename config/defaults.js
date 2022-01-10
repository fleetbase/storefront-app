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
        enabledTranslations: ['en'],
    },

    InterfaceConfig: {
        storefront: {
            defaultHeaderComponent: 'ui/headers/StorefrontHeader',
        },

        network: {
            defaultHeaderComponent: 'ui/headers/NetworkHeader',

            exploreScreen: {
                defaultCategoryComponent: 'ui/NetworkCategoryBlock',
                networkHeaderProps: {},
                defaultCategoryComponentProps: {
                    containerStyle: {},
                },
            },

            storeScreen: {
                networkHeaderProps: {},
            },

            mapScreen: {
                networkHeaderProps: {},
            },

            networkCategoryScreen: {
                networkHeaderProps: {},
            },
        },

        cart: {
            cartScreen: {
                networkHeaderProps: {},
            },
        },

        headerComponent: {
            displayLocalePicker: true,
            displayLocationPicker: true,
            displayLogoText: true,
            backgroundImage: null,
            backgroundImageResizeMode: 'cover',
            backgroundImageStyle: {},
            containerStyle: {},
            searchButtonStyle: {},
            searchButtonIconStyle: {},
            categoryButtonStyle: {},
            localePickerStyle: {},
            locationPickerStyle: {},
        },

        loginScreen: {
            containerStyle: {},
            contentContainerStyle: {},
            loginFormContainerStyle: {},
            verifyFormContainerStyle: {},
            containerBackgroundImage: null,
            containerBackgroundImageStyle: {},
            containerBackgroundResizeMode: 'cover',
            headerContainerStyle: {},
            headerIconContainerStyle: {},
            headerIconStyle: {},
            headerTextStyle: {},
            phoneInputStyle: {},
            phoneInputProps: {},
            sendVerificationCodeButtonStyle: {},
            sendVerificationCodeButtonTextStyle: {},
            createAccountButtonStyle: {},
            createAccountButtonTextStyle: {},
            verifyCodeInputStyle: {},
            verifyCodeInputProps: {},
            retryButtonStyle: {},
            retryButtonTextStyle: {},
            verifyCodeButtonStyle: {},
            verifyCodeButtonTextStyle: {},
        },

        createAccountScreen: {
            containerStyle: {},
            contentContainerStyle: {},
            createAccountFormContainerStyle: {},
            verifyFormContainerStyle: {},
            containerBackgroundImage: null,
            containerBackgroundImageStyle: {},
            containerBackgroundResizeMode: 'cover',
            headerContainerStyle: {},
            headerIconContainerStyle: {},
            headerIconStyle: {},
            headerTextStyle: {},
            nameInputStyle: {},
            nameInputProps: {},
            phoneInputStyle: {},
            phoneInputProps: {},
            sendVerificationCodeButtonStyle: {},
            sendVerificationCodeButtonTextStyle: {},
            verifyCodeInputStyle: {},
            verifyCodeInputProps: {},
            retryButtonStyle: {},
            retryButtonTextStyle: {},
            verifyCodeButtonStyle: {},
            verifyCodeButtonTextStyle: {},
            greetingContainerStyle: {},
            greetingLine1TextStyle: {},
            greetingLine2TextStyle: {},
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
            signedOutBackgroundResizeMode: 'cover',
        },
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
