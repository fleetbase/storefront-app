/**
 * TrueVegan Theme Configuration - FINAL CORRECTED VERSION
 *
 * This file contains the custom TrueVegan brand theme colors for both light and dark modes.
 * Based on the TrueVegan Brand Guide v1 (03/10/25)
 *
 * Brand Colors:
 * - Black: #1D252C (RGB: 29, 37, 44)
 * - Bone White: #F0EEEB (RGB: 240, 238, 235)
 * - True Blue: #345A73 (RGB: 52, 90, 115) - PRIMARY BRAND COLOR
 * - Deep Navy: #002639 (RGB: 0, 38, 57)
 *
 * VERIFIED: True Blue #345A73 is correctly used throughout this theme.
 */

// TrueVegan Brand Color Palette
export const trueveganColors = {
    // Primary brand colors
    black: '#1D252C',
    boneWhite: '#F0EEEB',
    trueBlue: '#345A73', // PRIMARY BRAND COLOR
    deepNavy: '#002639',

    // Extended palette - lighter and darker variations for UI elements
    // True Blue variations - generated with #345A73 as the base (500 position)
    trueBlue50: '#e9f2f7',
    trueBlue100: '#c7dce8',
    trueBlue200: '#a2c5d8',
    trueBlue300: '#7daec8',
    trueBlue400: '#6097bb',
    trueBlue500: '#345A73', // ⭐ PRIMARY BRAND COLOR - Base True Blue
    trueBlue600: '#2f5268',
    trueBlue700: '#28485c',
    trueBlue800: '#223e50',
    trueBlue900: '#162e3c',

    // Deep Navy variations
    deepNavy50: '#e6eef2',
    deepNavy100: '#b3ccd9',
    deepNavy200: '#80aabf',
    deepNavy300: '#4d88a6',
    deepNavy400: '#1a668c',
    deepNavy500: '#004d73',
    deepNavy600: '#003d5a',
    deepNavy700: '#002e42',
    deepNavy800: '#002639', // Base Deep Navy
    deepNavy900: '#001a26',

    // Bone White variations for subtle backgrounds
    boneWhite50: '#ffffff',
    boneWhite100: '#f9f8f6',
    boneWhite200: '#f0eeeb', // Base Bone White
    boneWhite300: '#e7e4e0',
    boneWhite400: '#dedbd5',
    boneWhite500: '#d5d1ca',
    boneWhite600: '#ccc8bf',
    boneWhite700: '#c3beb4',
    boneWhite800: '#bab5a9',
    boneWhite900: '#b1ab9e',

    // Semantic colors using brand palette
    success: '#4d88a6', // Lighter blue-green from palette
    error: '#8c4d4d', // Muted red that complements the palette
    warning: '#8c7a4d', // Muted amber/gold
    info: '#6097bb', // Medium blue from True Blue palette
};

// Light Mode Base Theme
export const trueveganLightBase = {
    // Backgrounds
    background: trueveganColors.boneWhite200, // #F0EEEB
    surface: trueveganColors.boneWhite100, // Lighter surface

    // Text colors
    color: trueveganColors.black, // #1D252C
    textPrimary: trueveganColors.deepNavy800, // #002639
    textSecondary: trueveganColors.trueBlue700, // #28485c
    textPlaceholder: trueveganColors.trueBlue300, // #7daec8

    // Primary colors (True Blue #345A73)
    primary: trueveganColors.trueBlue500, // #345A73 ⭐ PRIMARY BRAND COLOR
    primaryBorder: trueveganColors.trueBlue700, // #28485c
    primaryText: trueveganColors.boneWhite200, // Brand bone white

    // Secondary colors
    secondary: trueveganColors.boneWhite300, // #e7e4e0
    secondaryBorder: trueveganColors.trueBlue300, // #7daec8

    // Borders and shadows
    borderColor: trueveganColors.boneWhite400, // #dedbd5
    borderColorWithShadow: trueveganColors.boneWhite500, // #d5d1ca
    shadowColor: trueveganColors.black, // #1D252C
    borderActive: trueveganColors.trueBlue600, // #2f5268

    // Semantic colors
    success: trueveganColors.success,
    error: trueveganColors.error,
    warning: trueveganColors.warning,
    info: trueveganColors.info,

    // Semantic borders
    successBorder: '#3d6e85',
    errorBorder: '#6c3d3d',
    warningBorder: '#6c5e3d',
    infoBorder: '#4a7a9a',

    // Semantic text
    successText: trueveganColors.boneWhite50,
    errorText: trueveganColors.boneWhite50,
    warningText: trueveganColors.boneWhite50,
    infoText: trueveganColors.boneWhite50,
};

// Dark Mode Base Theme
export const trueveganDarkBase = {
    // Backgrounds - using deep navy and darker blues
    background: trueveganColors.deepNavy900, // #001a26
    surface: trueveganColors.deepNavy800, // #002639

    // Text colors
    color: trueveganColors.boneWhite200, // #F0EEEB
    textPrimary: trueveganColors.boneWhite100, // #f9f8f6
    textSecondary: trueveganColors.trueBlue200, // #a2c5d8
    textPlaceholder: trueveganColors.trueBlue400, // #6097bb

    // Primary colors (lighter True Blue for dark mode)
    primary: trueveganColors.trueBlue300, // #7daec8
    primaryBorder: trueveganColors.trueBlue200, // #a2c5d8
    primaryText: trueveganColors.deepNavy900, // Dark text on light primary

    // Secondary colors
    secondary: trueveganColors.deepNavy700, // #002e42
    secondaryBorder: trueveganColors.trueBlue600, // #2f5268

    // Borders and shadows
    borderColor: trueveganColors.deepNavy700, // #002e42
    borderColorWithShadow: trueveganColors.trueBlue800, // #223e50
    shadowColor: '#000000',
    borderActive: trueveganColors.trueBlue300, // #7daec8

    // Semantic colors (lighter versions for dark mode)
    success: trueveganColors.deepNavy300, // #4d88a6
    error: '#a66666',
    warning: '#a68f66',
    info: trueveganColors.trueBlue300, // #7daec8

    // Semantic borders
    successBorder: trueveganColors.deepNavy200, // #80aabf
    errorBorder: '#8c5252',
    warningBorder: '#8c7552',
    infoBorder: trueveganColors.trueBlue200, // #a2c5d8

    // Semantic text
    successText: trueveganColors.deepNavy900,
    errorText: trueveganColors.boneWhite50,
    warningText: trueveganColors.deepNavy900,
    infoText: trueveganColors.deepNavy900,
};

// Export the color palette for use in tokens
export const trueveganColorPalette = {
    truevegan: {
        50: trueveganColors.trueBlue50,
        100: trueveganColors.trueBlue100,
        200: trueveganColors.trueBlue200,
        300: trueveganColors.trueBlue300,
        400: trueveganColors.trueBlue400,
        500: trueveganColors.trueBlue500, // #345A73 ⭐
        600: trueveganColors.trueBlue600,
        700: trueveganColors.trueBlue700,
        800: trueveganColors.trueBlue800,
        900: trueveganColors.trueBlue900,
    },
    trueveganNavy: {
        50: trueveganColors.deepNavy50,
        100: trueveganColors.deepNavy100,
        200: trueveganColors.deepNavy200,
        300: trueveganColors.deepNavy300,
        400: trueveganColors.deepNavy400,
        500: trueveganColors.deepNavy500,
        600: trueveganColors.deepNavy600,
        700: trueveganColors.deepNavy700,
        800: trueveganColors.deepNavy800,
        900: trueveganColors.deepNavy900,
    },
    trueveganBone: {
        50: trueveganColors.boneWhite50,
        100: trueveganColors.boneWhite100,
        200: trueveganColors.boneWhite200,
        300: trueveganColors.boneWhite300,
        400: trueveganColors.boneWhite400,
        500: trueveganColors.boneWhite500,
        600: trueveganColors.boneWhite600,
        700: trueveganColors.boneWhite700,
        800: trueveganColors.boneWhite800,
        900: trueveganColors.boneWhite900,
    },
};
