import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createScreenRegistry } from '../../src/extensions/screens/registry';
import { ScreenRegistryProvider } from '../../src/extensions/screens/ScreenRegistryContext';
import { screenSlot } from '../../src/extensions/screens/screen-slot';
import { SCREEN_IDS } from '../../src/extensions/screens/screen-ids';
import type { ScreenRegistryDefinition } from '../../src/extensions/screens/types';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

const Label = ({ text, route }: any) => React.createElement('label', { text, param: route?.params?.storeId });
const component = (text: string) => (props: any) => <Label text={text} {...props} />;
const moduleOf = (Component: any) => () => Promise.resolve({ default: Component });

function makeDefaults(overrides: Partial<Record<string, any>> = {}): ScreenRegistryDefinition {
    return Object.fromEntries(SCREEN_IDS.map((id) => [id, { load: overrides[id] ?? moduleOf(component(`default:${id}`)) }])) as ScreenRegistryDefinition;
}

async function render(element: React.ReactElement) {
    let renderer: any;
    await act(async () => {
        renderer = TestRenderer.create(element);
    });
    // Let lazy loads settle.
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
    return renderer;
}

const texts = (renderer: any) => renderer.root.findAll((node: any) => node.type === 'label').map((node: any) => node.props.text);

describe('createScreenRegistry', () => {
    test('resolves defaults when there is no override', () => {
        const registry = createScreenRegistry({}, { defaults: makeDefaults(), strict: true });
        expect(registry.resolve('store.home').source).toBe('default');
        expect(registry.hasOverride('store.home')).toBe(false);
    });

    test('resolves overrides and compiled-in variants', () => {
        const registry = createScreenRegistry(
            { 'store.home': { load: moduleOf(component('brand')), variants: { editorial: moduleOf(component('editorial')) } } },
            { defaults: makeDefaults(), strict: true }
        );
        expect(registry.resolve('store.home').source).toBe('override');
        expect(registry.resolve('store.home', 'editorial').source).toBe('variant');
        // Unknown variant keys fall back to the override.
        expect(registry.resolve('store.home', 'missing').source).toBe('override');
        expect(registry.hasOverride('store.home')).toBe(true);
    });

    test('returns stable components for the same resolution', () => {
        const registry = createScreenRegistry({}, { defaults: makeDefaults(), strict: true });
        expect(registry.resolve('cart').Component).toBe(registry.resolve('cart').Component);
    });

    test('rejects unknown ids and malformed entries in strict mode', () => {
        expect(() => createScreenRegistry({ 'nope.screen': { load: moduleOf(component('x')) } } as any, { defaults: makeDefaults(), strict: true })).toThrow(/Unknown screen id/);
        expect(() => createScreenRegistry({ 'store.home': { component: component('x') } } as any, { defaults: makeDefaults(), strict: true })).toThrow(/Invalid override/);
        expect(() => createScreenRegistry({ 'store.home': { load: moduleOf(component('x')), variants: { a: 'x' } } } as any, { defaults: makeDefaults(), strict: true })).toThrow(/Invalid override/);
    });

    test('warns and keeps the default for invalid overrides outside strict mode', () => {
        const warn = jest.fn();
        const registry = createScreenRegistry({ 'store.home': { load: 'not-a-function' } } as any, { defaults: makeDefaults(), strict: false, warn });
        expect(warn).toHaveBeenCalledTimes(1);
        expect(registry.resolve('store.home').source).toBe('default');
    });

    test('ignores overrides restricted to other platforms', () => {
        const overrides = { 'store.home': { load: moduleOf(component('web-only')), platforms: ['web' as const] } };
        expect(createScreenRegistry(overrides, { defaults: makeDefaults(), strict: true, platform: 'ios' }).resolve('store.home').source).toBe('default');
        expect(createScreenRegistry(overrides, { defaults: makeDefaults(), strict: true, platform: 'web' }).resolve('store.home').source).toBe('override');
    });
});

describe('screenSlot', () => {
    const Slot = screenSlot('store.home');
    const props = { route: { key: 'k', name: 'StoreHome', params: { storeId: 'store_1' } }, navigation: {} };
    const onError = jest.fn();

    const renderSlot = (registry: any, variants = {}) =>
        render(
            <ScreenRegistryProvider
                registry={registry}
                variants={variants}
                onError={onError}
                renderLoading={() => <Label text='loading' />}
                renderLoadError={() => <Label text='load-error' />}
            >
                <Slot {...props} />
            </ScreenRegistryProvider>
        );

    beforeEach(() => {
        onError.mockClear();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        (console.error as jest.Mock).mockRestore?.();
    });

    test('is stable per screen id', () => {
        expect(screenSlot('store.home')).toBe(Slot);
    });

    test('renders the default screen with route props', async () => {
        const renderer = await renderSlot(createScreenRegistry({}, { defaults: makeDefaults(), strict: true }));
        expect(texts(renderer)).toEqual(['default:store.home']);
        expect(renderer.root.findByType('label').props.param).toBe('store_1');
    });

    test('renders a compiled-in override without editing the navigator', async () => {
        const registry = createScreenRegistry({ 'store.home': { load: moduleOf(component('brand')) } }, { defaults: makeDefaults(), strict: true });
        const renderer = await renderSlot(registry);
        expect(texts(renderer)).toEqual(['brand']);
    });

    test('renders a declaratively selected variant', async () => {
        const registry = createScreenRegistry(
            { 'store.home': { load: moduleOf(component('brand')), variants: { editorial: moduleOf(component('editorial')) } } },
            { defaults: makeDefaults(), strict: true }
        );
        const renderer = await renderSlot(registry, { 'store.home': 'editorial' });
        expect(texts(renderer)).toEqual(['editorial']);
    });

    test('lets an override compose the default screen', async () => {
        const Composed = ({ DefaultScreen, ...rest }: any) => (
            <>
                <Label text='hero' />
                <DefaultScreen {...rest} />
            </>
        );
        const registry = createScreenRegistry({ 'store.home': { load: moduleOf(Composed) } }, { defaults: makeDefaults(), strict: true });
        const renderer = await renderSlot(registry);
        expect(texts(renderer)).toEqual(['hero', 'default:store.home']);
    });

    test('falls back to the default when an override throws while rendering', async () => {
        const Broken = () => {
            throw new Error('boom');
        };
        const registry = createScreenRegistry({ 'store.home': { load: moduleOf(Broken) } }, { defaults: makeDefaults(), strict: true });
        const renderer = await renderSlot(registry);
        expect(texts(renderer)).toEqual(['default:store.home']);
        expect(renderer.root.findByType('label').props.param).toBe('store_1');
        expect(onError).toHaveBeenCalledWith(expect.any(Error), { id: 'store.home', source: 'override' });
    });

    test('falls back to the default when an override fails to load', async () => {
        const registry = createScreenRegistry({ 'store.home': { load: () => Promise.reject(new Error('missing chunk')) } }, { defaults: makeDefaults(), strict: true });
        const renderer = await renderSlot(registry);
        expect(texts(renderer)).toEqual(['default:store.home']);
    });

    test('falls back to the default when an override module has no component', async () => {
        const registry = createScreenRegistry({ 'store.home': { load: () => Promise.resolve({ default: 42 } as any) } }, { defaults: makeDefaults(), strict: true });
        const renderer = await renderSlot(registry);
        expect(texts(renderer)).toEqual(['default:store.home']);
    });

    test('renders the load-error view when the default also fails', async () => {
        const defaults = makeDefaults({ 'store.home': () => Promise.reject(new Error('default missing')) });
        const registry = createScreenRegistry({}, { defaults, strict: true });
        const renderer = await renderSlot(registry);
        expect(texts(renderer)).toEqual(['load-error']);
        expect(onError).toHaveBeenCalledWith(expect.any(Error), { id: 'store.home', source: 'default' });
    });

    test('shows the loading view until a lazy screen resolves', async () => {
        let resolveModule: (value: any) => void = () => {};
        const defaults = makeDefaults({ 'store.home': () => new Promise((resolve) => (resolveModule = resolve)) });
        const registry = createScreenRegistry({}, { defaults, strict: true });
        const renderer = await renderSlot(registry);
        expect(texts(renderer)).toEqual(['loading']);
        await act(async () => {
            resolveModule({ default: component('late') });
        });
        expect(texts(renderer)).toEqual(['late']);
    });

    test('renders preloaded screens without a loading view', async () => {
        const registry = createScreenRegistry({}, { defaults: makeDefaults(), strict: true });
        await registry.preload(['store.home']);
        let renderer: any;
        act(() => {
            renderer = TestRenderer.create(
                <ScreenRegistryProvider registry={registry} renderLoading={() => <Label text='loading' />}>
                    <Slot {...props} />
                </ScreenRegistryProvider>
            );
        });
        expect(texts(renderer)).toEqual(['default:store.home']);
    });
});
