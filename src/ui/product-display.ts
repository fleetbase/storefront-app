import { attr, usableImageUrl } from './store-display';

export type ProductSummary = {
    id: string | null;
    name: string;
    description: string | null;
    imageUrl: string | null;
    /** Minor units (cents), as the API returns them. */
    price: number;
    salePrice: number | null;
    onSale: boolean;
    currency: string | null;
    available: boolean;
    isService: boolean;
    isBookable: boolean;
    recommended: boolean;
    storeId: string | null;
    storeName: string | null;
};

const money = (value: unknown): number | null => {
    const number = typeof value === 'string' ? Number(value) : value;
    return typeof number === 'number' && Number.isFinite(number) ? number : null;
};

/** Everything a product row or tile shows, from an SDK product or plain JSON. */
export function productSummary(product: unknown): ProductSummary {
    const images = attr<unknown[]>(product, 'images', []);
    const firstImage = Array.isArray(images) ? images.find((image) => typeof image === 'string') : undefined;
    const price = money(attr(product, 'price')) ?? 0;
    const salePrice = money(attr(product, 'sale_price'));
    const onSale = attr<boolean>(product, 'is_on_sale', false) === true && salePrice !== null && salePrice < price;
    const store = attr<any>(product, 'store', null);

    return {
        id: attr<string | null>(product, 'id', null),
        name: attr<string>(product, 'name', ''),
        description: attr<string | null>(product, 'description', null),
        imageUrl: usableImageUrl(attr(product, 'primary_image_url')) ?? usableImageUrl(firstImage),
        price,
        salePrice: onSale ? salePrice : null,
        onSale,
        currency: attr<string | null>(product, 'currency', null),
        available: attr<boolean>(product, 'is_available', true) !== false,
        isService: attr<boolean>(product, 'is_service', false) === true,
        isBookable: attr<boolean>(product, 'is_bookable', false) === true,
        recommended: attr<boolean>(product, 'is_recommended', false) === true,
        storeId: attr<string | null>(store, 'id', null) ?? attr<string | null>(product, 'store_id', null),
        storeName: attr<string | null>(store, 'name', null),
    };
}
