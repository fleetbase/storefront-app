import { labelPreset, movedEnough, placeAttributes, placeFields, placeLines, regionAround, sortPlaces, validatePlace } from '../../src/commerce/places';

const json = { id: 'place_1', name: ' Home ', street1: '612 Hougang Ave 8', street2: '#05-12', neighborhood: 'Hougang', city: 'Singapore', postal_code: 530612, phone: '+6591234567', type: 'apartment', meta: { instructions: 'Ring twice' } };

describe('placeFields', () => {
    it('reads plain JSON and SDK instances alike', () => {
        const expected = { name: 'Home', street1: '612 Hougang Ave 8', street2: '#05-12', neighborhood: 'Hougang', city: 'Singapore', postalCode: '530612', phone: '+6591234567', instructions: 'Ring twice', type: 'apartment' };
        expect(placeFields(json)).toEqual(expected);
        const instance = { getAttribute: (key: string) => key.split('.').reduce((value: any, part) => value?.[part], json) };
        expect(placeFields(instance)).toEqual(expected);
    });

    it('fills blanks for a new place', () => {
        expect(placeFields(null)).toEqual({ name: '', street1: '', street2: '', neighborhood: '', city: '', postalCode: '', phone: '', instructions: '', type: null });
    });
});

describe('placeAttributes and validatePlace', () => {
    it('trims and drops empty optional fields', () => {
        const fields = { ...placeFields(json), street2: '  ', neighborhood: '', phone: '', instructions: ' ' };
        expect(placeAttributes(fields)).toEqual({ name: 'Home', street1: '612 Hougang Ave 8', street2: null, neighborhood: null, city: 'Singapore', postal_code: '530612', phone: null, type: 'apartment', meta: { instructions: null } });
        expect(placeAttributes(placeFields(json)).meta).toEqual({ instructions: 'Ring twice' });
    });

    it('requires a label and a street', () => {
        expect(validatePlace(placeFields(json))).toEqual({});
        expect(validatePlace(placeFields({ name: ' ', street1: '' }))).toEqual({ name: 'required', street1: 'required' });
    });
});

describe('labelPreset', () => {
    const labels = { home: 'Home', work: 'Work', other: 'Other' };
    it('matches presets case-insensitively and treats anything else as other', () => {
        expect(labelPreset(' home', labels)).toBe('home');
        expect(labelPreset('WORK', labels)).toBe('work');
        expect(labelPreset("Mum's", labels)).toBe('other');
        expect(labelPreset('Other', labels)).toBe('other');
        expect(labelPreset('', labels)).toBeNull();
    });
});

describe('placeLines', () => {
    it('uses the label as the title and the address below it', () => {
        expect(placeLines(json)).toEqual({ title: 'Home', address: '612 Hougang Ave 8, #05-12, Hougang, Singapore, 530612' });
    });
    it('falls back to the street as the title', () => {
        expect(placeLines({ street1: '1 Main St', city: 'Singapore' })).toEqual({ title: '1 Main St', address: 'Singapore' });
        expect(placeLines({})).toEqual({ title: '', address: '' });
    });
});

describe('sortPlaces', () => {
    const places = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, {} as { id?: string }];
    it('puts the default first and drops places without an id', () => {
        expect(sortPlaces(places, 'c').map((place) => place.id)).toEqual(['c', 'a', 'b']);
        expect(sortPlaces(places, 'a').map((place) => place.id)).toEqual(['a', 'b', 'c']);
        expect(sortPlaces(places, null).map((place) => place.id)).toEqual(['a', 'b', 'c']);
    });
});

describe('regionAround and movedEnough', () => {
    it('centres on valid coordinates and falls back otherwise', () => {
        expect(regionAround([1.37, 103.89])).toEqual({ latitude: 1.37, longitude: 103.89, latitudeDelta: 0.005, longitudeDelta: 0.005 });
        expect(regionAround(['1.5', '104'], undefined, 0.01)).toMatchObject({ latitude: 1.5, longitude: 104, latitudeDelta: 0.01 });
        expect(regionAround([0, 0], [10, 20])).toMatchObject({ latitude: 10, longitude: 20 });
        expect(regionAround([200, 0], [10, 20])).toMatchObject({ latitude: 10 });
        expect(regionAround(null)).toMatchObject({ latitude: 1.3521, longitude: 103.8198 });
    });

    it('ignores tiny map movements', () => {
        const a = { latitude: 1.37, longitude: 103.89 };
        expect(movedEnough(a, { latitude: 1.37001, longitude: 103.89001 })).toBe(false);
        expect(movedEnough(a, { latitude: 1.3702, longitude: 103.89 })).toBe(true);
        expect(movedEnough(a, { latitude: 1.37, longitude: 103.8902 })).toBe(true);
    });
});
