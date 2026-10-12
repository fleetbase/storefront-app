/** The screens of the add/edit address flow, in whichever stack they were opened. */
export const PLACE_FLOW_ROUTES = ['AddNewLocation', 'LocationPicker', 'EditLocation', 'EditLocationCoord'];

type Route = { name: string; key?: string };

/**
 * The screen that opened the address flow: the route just below the flow's screens at
 * the top of the stack. `null` when the flow is the whole stack or was opened from the
 * location prompt, where the app should restart its boot instead.
 */
export function flowOrigin(routes: Route[] | null | undefined): Route | null {
    const list = Array.isArray(routes) ? routes : [];
    let index = list.length - 1;
    while (index >= 0 && PLACE_FLOW_ROUTES.includes(list[index].name)) index -= 1;
    const origin = index >= 0 ? list[index] : null;
    if (!origin || origin.name === 'LocationPermission' || origin.name === 'Boot') return null;
    return origin;
}

/** Leave the address flow: back to the screen that opened it, or restart the boot. */
export function finishPlaceFlow(navigation: any) {
    const origin = flowOrigin(navigation.getState?.()?.routes);
    if (origin) {
        navigation.popTo(origin.name, undefined, { merge: true });
        return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'Boot' }] });
}
