# Detecting Modal Screens in React Navigation

## Overview

There are several ways to detect if a screen has been opened as a modal in React Navigation. This guide covers all the methods currently used in the Storefront app.

---

## Method 1: Check Route Parameters (Recommended)

Pass an `isModal` parameter when navigating to the screen.

### Usage

**When navigating:**
```typescript
navigation.navigate('Product', { 
    product: productData,
    isModal: true  // Explicitly mark as modal
});
```

**In the screen:**
```typescript
const ProductScreen = ({ route }) => {
    const params = route.params ?? {};
    const isModal = Platform.OS === 'ios' && (params.isModal ?? true);
    
    return (
        <YStack bottom={isModal ? insets.bottom : tabBarHeight}>
            {/* Content */}
        </YStack>
    );
};
```

**Pros:**
- ✅ Explicit and clear
- ✅ Works across all platforms
- ✅ Easy to understand and maintain

**Cons:**
- ❌ Requires passing parameter on every navigation

**Currently used in:**
- `ProductScreen.tsx`
- `CartItemScreen.tsx`

---

## Method 2: Check Route Name Pattern

Check if the route name ends with "Modal" suffix.

### Usage

```typescript
const CartScreen = ({ route }) => {
    const routeName = route.name;
    const isModalScreen = Platform.OS === 'ios' && 
                         typeof routeName === 'string' && 
                         routeName.endsWith('Modal');
    
    return (
        <YStack bottom={isModalScreen ? 0 : tabBarHeight}>
            {/* Content */}
        </YStack>
    );
};
```

**Pros:**
- ✅ No need to pass parameters
- ✅ Convention-based (if route name ends with "Modal", it's a modal)

**Cons:**
- ❌ Requires consistent naming convention
- ❌ Won't work if route names don't follow pattern

**Currently used in:**
- `CartScreen.tsx`

---

## Method 3: Check Navigation History

Use the existing `routeWasAccessed` utility to check if a specific route was accessed.

### Usage

```typescript
import { routeWasAccessed, wasAccessedFromCartModal } from '../utils';

const CheckoutScreen = () => {
    const navigation = useNavigation();
    
    // Check if CartModal was in the navigation history
    const isModalScreen = wasAccessedFromCartModal(navigation);
    
    return (
        <YStack bottom={isModalScreen ? insets.bottom : tabBarHeight}>
            {/* Content */}
        </YStack>
    );
};
```

### Existing Utility Functions

**`routeWasAccessed(navigation, routeName)`**
```javascript
export function routeWasAccessed(navigation, routeName) {
    const state = navigation.getState();
    const routes = state.routes || [];
    return routes.some((route) => route.name === routeName);
}
```

**`wasAccessedFromCartModal(navigation)`**
```javascript
export function wasAccessedFromCartModal(navigation) {
    return Platform.OS === 'ios' && routeWasAccessed(navigation, 'CartModal');
}
```

**Pros:**
- ✅ Detects modal context based on navigation history
- ✅ Useful for nested navigation flows

**Cons:**
- ❌ Only works if you know which modal route to check
- ❌ More complex logic

**Currently used in:**
- `QPayCheckoutScreen.tsx`
- `StripeCheckoutScreen.tsx`

---

## Method 4: Check Screen Options (Advanced)

Access the screen's navigation options to check the presentation mode.

### Usage

```typescript
import { useRoute, useNavigation } from '@react-navigation/native';

const MyScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    
    // Get the screen's options
    const options = navigation.getParent()?.options || {};
    const isModal = options.presentation === 'modal';
    
    return (
        <YStack>
            {isModal && <Text>This is a modal!</Text>}
        </YStack>
    );
};
```

**Pros:**
- ✅ Directly checks the navigation configuration
- ✅ Most accurate method

**Cons:**
- ❌ More complex
- ❌ May not work in all navigation structures

---

## Recommended Approach

For the Storefront app, use **Method 1 (Route Parameters)** combined with **Method 2 (Route Name Pattern)** as a fallback:

```typescript
const MyScreen = ({ route }) => {
    const params = route.params ?? {};
    const routeName = route.name;
    
    // Try parameter first, fall back to route name pattern
    const isModal = params.isModal ?? 
                   (typeof routeName === 'string' && routeName.endsWith('Modal'));
    
    // Apply Platform-specific logic if needed
    const useModalLayout = Platform.OS === 'ios' ? isModal : false;
    
    return (
        <YStack bottom={useModalLayout ? insets.bottom : tabBarHeight}>
            {/* Content */}
        </YStack>
    );
};
```

---

## Creating a Reusable Hook

You can create a custom hook to standardize modal detection:

```typescript
// src/hooks/use-is-modal.ts
import { Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { routeWasAccessed } from '../utils';

export function useIsModal(options = {}) {
    const route = useRoute();
    const navigation = useNavigation();
    const params = route.params ?? {};
    const routeName = route.name;
    
    // Check parameter
    if (params.isModal !== undefined) {
        return Platform.OS === 'ios' && params.isModal;
    }
    
    // Check route name pattern
    if (typeof routeName === 'string' && routeName.endsWith('Modal')) {
        return Platform.OS === 'ios';
    }
    
    // Check navigation history if modalRouteName provided
    if (options.modalRouteName) {
        return Platform.OS === 'ios' && 
               routeWasAccessed(navigation, options.modalRouteName);
    }
    
    return false;
}
```

**Usage:**
```typescript
import { useIsModal } from '../hooks/use-is-modal';

const MyScreen = () => {
    const isModal = useIsModal();
    // or
    const isModal = useIsModal({ modalRouteName: 'CartModal' });
    
    return (
        <YStack bottom={isModal ? insets.bottom : tabBarHeight}>
            {/* Content */}
        </YStack>
    );
};
```

---

## Platform Considerations

**iOS:**
- Modals have different presentation styles (card, fullScreenModal, etc.)
- Safe area insets behave differently in modals
- Tab bar is hidden in modals

**Android:**
- Modal presentation is less distinct from regular screens
- Status bar handling requires explicit safe area insets
- Tab bar behavior may need manual handling

**Current pattern in codebase:**
```typescript
const isModal = Platform.OS === 'ios' && (/* modal detection logic */);
```

This ensures modal-specific layouts only apply on iOS where the distinction matters most.

---

## Summary

| Method | Pros | Cons | Use Case |
|--------|------|------|----------|
| Route Parameters | Explicit, clear | Requires passing params | Most screens |
| Route Name Pattern | No params needed | Requires naming convention | Convention-based routing |
| Navigation History | Context-aware | Complex | Nested flows |
| Screen Options | Most accurate | Complex | Advanced cases |

**Recommendation:** Use Route Parameters as the primary method, with Route Name Pattern as a fallback.
