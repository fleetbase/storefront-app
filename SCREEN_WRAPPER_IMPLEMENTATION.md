# ScreenWrapper Component - Technical Implementation Document

## Executive Summary

This document outlines the design and implementation of a centralized `ScreenWrapper` component to manage screen spacing, safe areas, and modal-specific layouts across the Storefront app. This approach eliminates scattered Platform checks and provides a consistent, maintainable solution for handling Android/iOS differences.

---

## Problem Statement

### Current Issues

1. **Scattered Platform Logic**: Platform-specific spacing checks are duplicated across 30+ screens
2. **Inconsistent Modal Handling**: Different screens use different approaches to detect and handle modal presentation
3. **Android Spacing Issues**: Modal screens on Android overlap with the status bar
4. **Maintenance Burden**: Changes to spacing logic require updates in multiple files
5. **Mixed Approaches**: Some screens use `SafeAreaView`, others use `useSafeAreaInsets`, creating inconsistency

### Current State Analysis

**Screens Using SafeAreaView**: 27 screens
**Screens Using useSafeAreaInsets**: 11 screens
**Modal Screens**: 9 screens (with `presentation: 'modal'`)

---

## Proposed Solution: ScreenWrapper Component

### Architecture Overview

```
┌─────────────────────────────────────────┐
│         ScreenWrapper Component         │
│  ┌───────────────────────────────────┐  │
│  │   Platform Detection Layer        │  │
│  │   - iOS vs Android                │  │
│  │   - Modal vs Regular              │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Safe Area Management            │  │
│  │   - SafeAreaView wrapper          │  │
│  │   - useSafeAreaInsets hook        │  │
│  │   - Custom inset props            │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Spacing Logic                   │  │
│  │   - Top padding (status bar)      │  │
│  │   - Bottom padding (tab bar)      │  │
│  │   - Modal-specific adjustments    │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Children Rendering              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## Component API Design

### Props Interface

```typescript
interface ScreenWrapperProps {
  // Children
  children: React.ReactNode;
  
  // Modal Configuration
  isModal?: boolean;
  autoDetectModal?: boolean; // Default: true
  
  // Safe Area Configuration
  useSafeArea?: boolean; // Default: true
  edges?: ('top' | 'bottom' | 'left' | 'right')[]; // Default: ['top', 'bottom']
  
  // Custom Insets (overrides)
  topInset?: number;
  bottomInset?: number;
  leftInset?: number;
  rightInset?: number;
  
  // Padding
  padding?: number | string;
  paddingTop?: number | string;
  paddingBottom?: number | string;
  paddingHorizontal?: number | string;
  
  // Background
  backgroundColor?: string;
  
  // Scrollable
  scrollable?: boolean;
  scrollViewProps?: ScrollViewProps;
  
  // Tab Bar
  hasTabBar?: boolean; // Default: auto-detect from navigation
  
  // Style
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  
  // Advanced
  renderWrapper?: (children: React.ReactNode) => React.ReactNode;
  disablePlatformAdjustments?: boolean; // Bypass all platform logic
}
```

### Usage Examples

#### Basic Usage (Regular Screen)

```typescript
import ScreenWrapper from '../components/ScreenWrapper';

const MyScreen = () => {
  return (
    <ScreenWrapper>
      <YStack flex={1}>
        <Text>Screen Content</Text>
      </YStack>
    </ScreenWrapper>
  );
};
```

#### Modal Screen

```typescript
const ProductScreen = ({ route }) => {
  return (
    <ScreenWrapper isModal>
      <YStack flex={1}>
        <Text>Modal Content</Text>
      </YStack>
    </ScreenWrapper>
  );
};
```

#### Auto-Detect Modal

```typescript
const ProductScreen = ({ route }) => {
  // Automatically detects if opened as modal via route params or name
  return (
    <ScreenWrapper autoDetectModal>
      <YStack flex={1}>
        <Text>Content</Text>
      </YStack>
    </ScreenWrapper>
  );
};
```

#### Custom Insets

```typescript
const CustomScreen = () => {
  return (
    <ScreenWrapper topInset={20} bottomInset={0}>
      <YStack flex={1}>
        <Text>Custom Spacing</Text>
      </YStack>
    </ScreenWrapper>
  );
};
```

#### Scrollable Screen

```typescript
const LongContentScreen = () => {
  return (
    <ScreenWrapper scrollable>
      <YStack>
        {/* Long content that needs scrolling */}
      </YStack>
    </ScreenWrapper>
  );
};
```

#### Selective Safe Area Edges

```typescript
const PartialSafeAreaScreen = () => {
  return (
    <ScreenWrapper edges={['top']}> {/* Only top safe area */}
      <YStack flex={1}>
        <Text>Content</Text>
      </YStack>
    </ScreenWrapper>
  );
};
```

---

## Implementation Details

### 1. Modal Detection Logic

```typescript
function detectIsModal(route, autoDetect, explicitIsModal) {
  // Explicit prop takes precedence
  if (explicitIsModal !== undefined) {
    return explicitIsModal;
  }
  
  // Auto-detection
  if (autoDetect) {
    const params = route?.params ?? {};
    const routeName = route?.name;
    
    // Check params
    if (params.isModal !== undefined) {
      return params.isModal;
    }
    
    // Check route name pattern
    if (typeof routeName === 'string' && routeName.endsWith('Modal')) {
      return true;
    }
  }
  
  return false;
}
```

### 2. Platform-Specific Spacing

```typescript
function calculateTopSpacing(isModal, insets, customInset, platform) {
  // Custom inset overrides everything
  if (customInset !== undefined) {
    return customInset;
  }
  
  // Android modal needs status bar spacing
  if (platform === 'android' && isModal) {
    return insets.top;
  }
  
  // iOS modals handle their own spacing
  if (platform === 'ios' && isModal) {
    return 0;
  }
  
  // Regular screens use SafeAreaView which handles it
  return 0;
}
```

### 3. Component Structure

```typescript
const ScreenWrapper = ({
  children,
  isModal: explicitIsModal,
  autoDetectModal = true,
  useSafeArea = true,
  edges = ['top', 'bottom'],
  backgroundColor,
  scrollable = false,
  ...props
}) => {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  
  // Determine if modal
  const isModal = detectIsModal(route, autoDetectModal, explicitIsModal);
  
  // Calculate spacing
  const topSpacing = calculateTopSpacing(
    isModal, 
    insets, 
    props.topInset, 
    Platform.OS
  );
  
  const bottomSpacing = calculateBottomSpacing(
    isModal,
    insets,
    tabBarHeight,
    props.bottomInset,
    props.hasTabBar
  );
  
  // Render
  const content = (
    <View style={[
      styles.container,
      { 
        backgroundColor: backgroundColor || theme.background.val,
        paddingTop: topSpacing,
        paddingBottom: bottomSpacing,
      },
      props.style
    ]}>
      {children}
    </View>
  );
  
  if (useSafeArea) {
    return (
      <SafeAreaView 
        style={{ flex: 1, backgroundColor: backgroundColor || theme.background.val }}
        edges={edges}
      >
        {scrollable ? (
          <ScrollView {...props.scrollViewProps}>
            {content}
          </ScrollView>
        ) : content}
      </SafeAreaView>
    );
  }
  
  return scrollable ? (
    <ScrollView {...props.scrollViewProps}>
      {content}
    </ScrollView>
  ) : content;
};
```

---

## Modal Screens Inventory

### Screens with `presentation: 'modal'`

| Screen | File | Current Approach | Notes |
|--------|------|------------------|-------|
| ProductModal | ProductScreen.tsx | `useSafeAreaInsets` + Platform check | Has absolute positioned close button |
| CartModal | CartScreen.tsx | `SafeAreaView` + route name detection | Already handles spacing well |
| CartItem | CartItemScreen.tsx | `useSafeAreaInsets` + Platform check | Has absolute positioned close button |
| Catalog | CatalogScreen.tsx | `useSafeAreaInsets` + Platform check | Header needs spacing |
| OrderModal | OrderScreen.tsx | `headerShown: true` | React Navigation handles it |
| Receipt | ReceiptScreen.tsx | `headerShown: true` | React Navigation handles it |
| StoreInfo | StoreInfoScreen.tsx | No safe area handling | Uses StoreHeader component |
| ModalTest | TestScreen.tsx | `useSafeAreaInsets` | Test screen only |

### Priority for Migration

**High Priority** (visible spacing issues):
1. ProductScreen
2. CartItemScreen
3. CatalogScreen
4. StoreInfoScreen

**Medium Priority** (working but inconsistent):
5. CartScreen
6. TestScreen

**Low Priority** (React Navigation handles):
7. OrderScreen
8. ReceiptScreen

---

## Migration Strategy

### Phase 1: Create ScreenWrapper Component

1. Create `/src/components/ScreenWrapper.tsx`
2. Implement core functionality
3. Add comprehensive JSDoc documentation
4. Create unit tests

### Phase 2: Migrate High-Priority Modal Screens

1. ProductScreen
2. CartItemScreen
3. CatalogScreen
4. StoreInfoScreen

**Migration Pattern:**

**Before:**
```typescript
const ProductScreen = ({ route }) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const isModal = Platform.OS === 'ios' && (params.isModal ?? true);
  
  return (
    <YStack flex={1} bg='$background'>
      <XStack 
        position='absolute' 
        top={Platform.OS === 'android' ? insets.top : 0}
      >
        {/* Close button */}
      </XStack>
      {/* Content */}
    </YStack>
  );
};
```

**After:**
```typescript
const ProductScreen = ({ route }) => {
  return (
    <ScreenWrapper isModal>
      <YStack flex={1}>
        <XStack position='absolute' top={0}>
          {/* Close button - spacing handled by wrapper */}
        </XStack>
        {/* Content */}
      </YStack>
    </ScreenWrapper>
  );
};
```

### Phase 3: Migrate Regular Screens

Gradually migrate non-modal screens to use ScreenWrapper for consistency.

### Phase 4: Cleanup

1. Remove scattered Platform checks
2. Remove redundant `useSafeAreaInsets` imports
3. Update documentation
4. Remove old patterns from codebase

---

## Benefits

### 1. Centralized Logic
- All spacing logic in one place
- Easy to update and maintain
- Consistent behavior across screens

### 2. Reduced Boilerplate
- No more repeated Platform checks
- No more manual inset calculations
- Cleaner screen components

### 3. Better Developer Experience
- Clear, declarative API
- Self-documenting props
- Easy to understand and use

### 4. Improved Maintainability
- Single source of truth
- Easier to debug spacing issues
- Simpler to add new features

### 5. Platform Consistency
- Guaranteed correct behavior on Android
- Guaranteed correct behavior on iOS
- No more platform-specific bugs

---

## Testing Strategy

### Unit Tests

```typescript
describe('ScreenWrapper', () => {
  it('applies Android modal spacing', () => {
    // Test Android modal top inset
  });
  
  it('does not apply iOS modal spacing', () => {
    // Test iOS modal behavior
  });
  
  it('auto-detects modal from route params', () => {
    // Test modal detection
  });
  
  it('respects custom insets', () => {
    // Test custom inset overrides
  });
});
```

### Integration Tests

1. Test each migrated screen on Android
2. Test each migrated screen on iOS
3. Verify no visual regressions
4. Test modal presentation
5. Test safe area edge cases

### Visual Regression Tests

Take screenshots before/after migration to ensure pixel-perfect consistency.

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review and approve this document
- [ ] Identify any additional requirements
- [ ] Set up testing environment

### Implementation
- [ ] Create ScreenWrapper component
- [ ] Add TypeScript types
- [ ] Add JSDoc documentation
- [ ] Write unit tests
- [ ] Migrate ProductScreen (test case)
- [ ] Verify on Android and iOS
- [ ] Migrate remaining high-priority screens
- [ ] Migrate medium-priority screens
- [ ] Update developer documentation

### Post-Implementation
- [ ] Code review
- [ ] QA testing on both platforms
- [ ] Update style guide
- [ ] Create migration guide for team
- [ ] Remove deprecated patterns

---

## Alternative Approaches Considered

### 1. HOC (Higher-Order Component)
**Pros**: Functional composition
**Cons**: More complex, harder to type, less clear

### 2. Custom Hook Only
**Pros**: Lightweight
**Cons**: Still requires boilerplate in each screen

### 3. Navigation-Level Configuration
**Pros**: Configured once per screen
**Cons**: Less flexible, harder to customize per-instance

**Decision**: Component wrapper provides the best balance of flexibility, clarity, and maintainability.

---

## Future Enhancements

1. **Keyboard Avoidance**: Add `KeyboardAvoidingView` support
2. **Loading States**: Built-in loading overlay
3. **Error Boundaries**: Automatic error handling
4. **Analytics**: Screen view tracking
5. **Accessibility**: Enhanced a11y features
6. **Theming**: Deep theme integration

---

## Conclusion

The ScreenWrapper component provides a robust, maintainable solution for managing screen spacing across the Storefront app. By centralizing platform-specific logic and providing a clear, declarative API, it eliminates the current scattered approach and ensures consistent behavior on both Android and iOS.

**Estimated Implementation Time**: 2-3 days
**Estimated Migration Time**: 1-2 days
**Total**: 3-5 days

**Risk Level**: Low (incremental migration, easy to rollback)
**Impact**: High (affects all screens, improves maintainability significantly)

---

## Appendix A: Complete Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Screen content |
| `isModal` | `boolean` | `undefined` | Explicit modal flag |
| `autoDetectModal` | `boolean` | `true` | Auto-detect modal from route |
| `useSafeArea` | `boolean` | `true` | Use SafeAreaView wrapper |
| `edges` | `Edge[]` | `['top','bottom']` | Which edges to apply safe area |
| `topInset` | `number` | `undefined` | Custom top spacing |
| `bottomInset` | `number` | `undefined` | Custom bottom spacing |
| `leftInset` | `number` | `undefined` | Custom left spacing |
| `rightInset` | `number` | `undefined` | Custom right spacing |
| `padding` | `number\|string` | `undefined` | All-sides padding |
| `paddingTop` | `number\|string` | `undefined` | Top padding |
| `paddingBottom` | `number\|string` | `undefined` | Bottom padding |
| `paddingHorizontal` | `number\|string` | `undefined` | Left/right padding |
| `backgroundColor` | `string` | `theme.background` | Background color |
| `scrollable` | `boolean` | `false` | Wrap in ScrollView |
| `scrollViewProps` | `ScrollViewProps` | `{}` | Props for ScrollView |
| `hasTabBar` | `boolean` | auto-detect | Whether screen has tab bar |
| `style` | `ViewStyle` | `undefined` | Container style |
| `contentContainerStyle` | `ViewStyle` | `undefined` | Content style |
| `renderWrapper` | `function` | `undefined` | Custom wrapper renderer |
| `disablePlatformAdjustments` | `boolean` | `false` | Disable all platform logic |

---

## Appendix B: Migration Examples

### Example 1: Simple Modal Screen

**Before:**
```typescript
const SimpleModal = ({ route }) => {
  const insets = useSafeAreaInsets();
  return (
    <YStack flex={1} pt={Platform.OS === 'android' ? insets.top : 0}>
      <Text>Content</Text>
    </YStack>
  );
};
```

**After:**
```typescript
const SimpleModal = ({ route }) => {
  return (
    <ScreenWrapper isModal>
      <YStack flex={1}>
        <Text>Content</Text>
      </YStack>
    </ScreenWrapper>
  );
};
```

### Example 2: Screen with Tab Bar

**Before:**
```typescript
const TabScreen = () => {
  const tabBarHeight = useBottomTabBarHeight();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} pb={tabBarHeight}>
        <Text>Content</Text>
      </YStack>
    </SafeAreaView>
  );
};
```

**After:**
```typescript
const TabScreen = () => {
  return (
    <ScreenWrapper hasTabBar>
      <YStack flex={1}>
        <Text>Content</Text>
      </YStack>
    </ScreenWrapper>
  );
};
```

### Example 3: Scrollable Screen

**Before:**
```typescript
const LongScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <YStack>
          {/* Long content */}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
};
```

**After:**
```typescript
const LongScreen = () => {
  return (
    <ScreenWrapper scrollable>
      <YStack>
        {/* Long content */}
      </YStack>
    </ScreenWrapper>
  );
};
```
