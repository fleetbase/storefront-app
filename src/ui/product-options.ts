/**
 * Choosing a product's options (variants and add-ons) for the product page: which
 * options can still be chosen, which required groups are missing, the unit price and
 * the variants/add-ons payload the cart expects.
 *
 * Variants are single-choice unless `is_multiselect`; add-ons are optional and multi-
 * choice. `is_required` and limits (`max` on variants, `max_selectable` on add-on
 * groups) are honoured when the API provides them.
 */

export type OptionItem = { id: string; name: string; description?: string | null; price: number; raw: any };
export type OptionGroup = { id: string; kind: 'variant' | 'addon'; name: string; description?: string | null; required: boolean; multiple: boolean; max: number | null; options: OptionItem[] };
export type OptionSelection = Record<string, string[]>;

const toNumber = (value: unknown): number => {
    const number = typeof value === 'string' ? Number(value) : value;
    return typeof number === 'number' && Number.isFinite(number) ? number : 0;
};
const positiveOrNull = (value: unknown): number | null => {
    const number = toNumber(value);
    return number > 0 ? Math.floor(number) : null;
};

/** Variant groups first, then add-on groups, from the API's `variants` and `addon_categories`. */
export function optionGroups(variants: unknown, addonCategories: unknown): OptionGroup[] {
    const groups: OptionGroup[] = [];
    for (const variant of Array.isArray(variants) ? variants : []) {
        if (!variant?.id) continue;
        const multiple = variant.is_multiselect === true;
        groups.push({
            id: String(variant.id),
            kind: 'variant',
            name: String(variant.name ?? ''),
            description: variant.description ?? null,
            required: variant.is_required === true,
            multiple,
            max: multiple ? positiveOrNull(variant.max) : 1,
            options: (Array.isArray(variant.options) ? variant.options : []).filter((option: any) => option?.id).map((option: any) => ({ id: String(option.id), name: String(option.name ?? ''), description: option.description ?? null, price: toNumber(option.additional_cost), raw: option })),
        });
    }
    for (const category of Array.isArray(addonCategories) ? addonCategories : []) {
        if (!category?.id) continue;
        groups.push({
            id: String(category.id),
            kind: 'addon',
            name: String(category.name ?? ''),
            description: category.description ?? null,
            required: category.is_required === true,
            multiple: true,
            max: positiveOrNull(category.max_selectable),
            options: (Array.isArray(category.addons) ? category.addons : [])
                .filter((addon: any) => addon?.id)
                .map((addon: any) => ({ id: String(addon.id), name: String(addon.name ?? ''), description: addon.description ?? null, price: toNumber(addon.is_on_sale ? addon.sale_price : addon.price), raw: addon })),
        });
    }
    return groups.filter((group) => group.options.length > 0);
}

/** Selects or clears an option. Single-choice groups swap; full multi-choice groups ignore new picks. */
export function toggleOption(groups: OptionGroup[], selection: OptionSelection, groupId: string, optionId: string): OptionSelection {
    const group = groups.find((item) => item.id === groupId);
    if (!group || !group.options.some((option) => option.id === optionId)) return selection;
    const current = selection[groupId] ?? [];
    if (current.includes(optionId)) {
        // A required single choice stays selected; picking another option replaces it.
        if (!group.multiple && group.required) return selection;
        return { ...selection, [groupId]: current.filter((id) => id !== optionId) };
    }
    if (!group.multiple) return { ...selection, [groupId]: [optionId] };
    if (group.max !== null && current.length >= group.max) return selection;
    return { ...selection, [groupId]: [...current, optionId] };
}

/** Whether an unselected option can still be chosen (multi-choice groups have room). */
export function canChoose(group: OptionGroup, selection: OptionSelection, optionId: string): boolean {
    const current = selection[group.id] ?? [];
    return current.includes(optionId) || !group.multiple || group.max === null || current.length < group.max;
}

/** Required groups with nothing chosen. */
export function missingGroups(groups: OptionGroup[], selection: OptionSelection): OptionGroup[] {
    return groups.filter((group) => group.required && (selection[group.id] ?? []).length === 0);
}

/** Price of one unit with the chosen options, in minor units. */
export function unitPrice(basePrice: number, groups: OptionGroup[], selection: OptionSelection): number {
    let total = basePrice;
    for (const group of groups) {
        for (const id of selection[group.id] ?? []) {
            total += group.options.find((option) => option.id === id)?.price ?? 0;
        }
    }
    return total;
}

/** The `variants` and `addons` arrays the cart's add/update endpoints take. */
export function cartOptions(groups: OptionGroup[], selection: OptionSelection): { variants: any[]; addons: any[] } {
    const variants: any[] = [];
    const addons: any[] = [];
    for (const group of groups) {
        for (const id of selection[group.id] ?? []) {
            const option = group.options.find((item) => item.id === id);
            if (option) (group.kind === 'variant' ? variants : addons).push(option.raw);
        }
    }
    return { variants, addons };
}

/** "Large · Glass vase · Greeting card" for cart lines and summaries. */
export function describeSelection(groups: OptionGroup[], selection: OptionSelection): string {
    return groups
        .flatMap((group) => (selection[group.id] ?? []).map((id) => group.options.find((option) => option.id === id)?.name))
        .filter(Boolean)
        .join(' · ');
}
