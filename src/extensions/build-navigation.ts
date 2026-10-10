import brandExtensions from '../generated/brand-extensions';
import { validateCustomNavigation } from './navigation';

/** The build's custom routes and tabs (brand/storefront.extensions.ts), validated once. */
export const customNavigation = validateCustomNavigation(brandExtensions.routes, brandExtensions.tabs);
