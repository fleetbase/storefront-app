import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockPost = jest.fn();

jest.mock('axios', () => ({ __esModule: true, default: { post: (...args: any[]) => mockPost(...args), isCancel: () => false } }));
jest.mock('react-native-maps', () => ({ Polyline: 'Polyline' }));
jest.mock('../../src/utils', () => ({ config: (key: string) => (key === 'GOOGLE_MAPS_API_KEY' ? 'config-key' : undefined) }));

import RouteDirections from '../../src/components/map/RouteDirections';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

const ROUTE = { routes: [{ polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC' }, distanceMeters: 2000, duration: '120s' }] };

async function render(element: React.ReactElement) {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
        renderer = TestRenderer.create(element);
    });
    return renderer!;
}

beforeEach(() => {
    mockPost.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
});

describe('RouteDirections', () => {
    it('asks the Routes API for the route and draws it', async () => {
        mockPost.mockResolvedValue({ data: ROUTE });
        const onReady = jest.fn();
        const renderer = await render(
            <RouteDirections origin={{ latitude: 1, longitude: 2 }} destination={{ latitude: 3, longitude: 4 }} apikey='prop-key' strokeWidth={4} strokeColor='#00f' onReady={onReady} />
        );

        const [url, body, options] = mockPost.mock.calls[0];
        expect(url).toBe('https://routes.googleapis.com/directions/v2:computeRoutes');
        expect(body.origin).toEqual({ location: { latLng: { latitude: 1, longitude: 2 } } });
        expect(body.destination).toEqual({ location: { latLng: { latitude: 3, longitude: 4 } } });
        expect(options.headers).toMatchObject({ 'X-Goog-Api-Key': 'prop-key', 'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.duration,routes.distanceMeters' });

        const line = renderer.root.findByType('Polyline' as any);
        expect(line.props.coordinates).toHaveLength(2);
        expect(line.props.strokeWidth).toBe(4);
        expect(line.props.strokeColor).toBe('#00f');
        expect(onReady).toHaveBeenCalledWith({ coordinates: line.props.coordinates, distance: 2, duration: 2 });
    });

    it('uses the configured key and only refetches when the route changes', async () => {
        mockPost.mockResolvedValue({ data: ROUTE });
        const renderer = await render(<RouteDirections origin={{ latitude: 1, longitude: 2 }} destination={{ latitude: 3, longitude: 4 }} onReady={() => {}} />);
        expect(mockPost.mock.calls[0][2].headers['X-Goog-Api-Key']).toBe('config-key');

        // New objects and a new callback, same coordinates.
        await act(async () => {
            renderer.update(<RouteDirections origin={{ latitude: 1, longitude: 2 }} destination={{ latitude: 3, longitude: 4 }} onReady={() => {}} />);
        });
        expect(mockPost).toHaveBeenCalledTimes(1);

        await act(async () => {
            renderer.update(<RouteDirections origin={{ latitude: 1.5, longitude: 2 }} destination={{ latitude: 3, longitude: 4 }} onReady={() => {}} />);
        });
        expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('draws nothing without both ends', async () => {
        const renderer = await render(<RouteDirections origin={{ latitude: 1, longitude: 2 }} destination={null} />);
        expect(mockPost).not.toHaveBeenCalled();
        expect(renderer.toJSON()).toBeNull();
    });

    it('reports an error and draws nothing when Google refuses', async () => {
        mockPost.mockRejectedValue({ response: { data: { error: { message: 'Routes API has not been used in project 123' } } } });
        const onError = jest.fn();
        const onReady = jest.fn();
        const renderer = await render(<RouteDirections origin={{ latitude: 1, longitude: 2 }} destination={{ latitude: 3, longitude: 4 }} onError={onError} onReady={onReady} />);
        expect(onError).toHaveBeenCalledWith('Routes API has not been used in project 123');
        expect(onReady).not.toHaveBeenCalled();
        expect(renderer.toJSON()).toBeNull();
    });
});
