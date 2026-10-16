/**
 * Nested categories, as the store page, the category list and truck menus show them.
 *
 * A store's categories come from `storefront/v1/categories` flat, each with its `parent` (the
 * parent's id) and `depth`; a catalog's categories carry `parent` too. They nest up to three
 * levels: Drinks › Coffee › Cold brew. Categories from an API without `parent` are all at the
 * top, as before.
 */

export const MAX_CATEGORY_DEPTH = 3;

export type CategoryNode = {
    id: string;
    name: string;
    iconUrl: string | null;
    parentId: string | null;
    /** 1 at the top. */
    depth: number;
    /** "Drinks › Coffee". */
    path: string;
    children: CategoryNode[];
    raw: any;
};

/** One heading's worth of a top-level section: the category's own products, then each subcategory's. */
export type CategoryGroup<T> = { id: string; name: string; path: string; level: number; items: T[] };

const attr = (resource: any, key: string) => (typeof resource?.getAttribute === 'function' ? resource.getAttribute(key) : resource?.[key]);

/** The categories as a tree, keeping the order they came in. */
export function categoryTree(categories: any[]): CategoryNode[] {
    const list = Array.from(categories ?? []).filter(Boolean);
    const ids = new Set(list.map((category) => String(attr(category, 'id') ?? category?.id ?? '')));
    const nodes = list.map((category) => {
        const id = String(attr(category, 'id') ?? category?.id ?? '');
        const parent = attr(category, 'parent');
        const parentId = parent && typeof parent === 'object' ? String(parent.id ?? '') : parent ? String(parent) : null;
        return {
            id,
            name: String(attr(category, 'name') ?? ''),
            iconUrl: attr(category, 'icon_url') ?? null,
            parentId: parentId && ids.has(parentId) && parentId !== id ? parentId : null,
            depth: 1,
            path: '',
            children: [] as CategoryNode[],
            raw: category,
        };
    });
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const seen = new Set<string>();
    const place = (node: CategoryNode, depth: number, trail: string[]) => {
        if (seen.has(node.id)) return;
        seen.add(node.id);
        node.depth = depth;
        node.path = [...trail, node.name].join(' › ');
        node.children = nodes.filter((child) => child.parentId === node.id);
        node.children.forEach((child) => place(child, depth + 1, [...trail, node.name]));
    };
    const roots = nodes.filter((node) => !node.parentId || !byId.has(node.parentId));
    roots.forEach((root) => place(root, 1, []));
    // A loop in the data leaves nodes unplaced: show them at the top rather than lose them.
    nodes.filter((node) => !seen.has(node.id)).forEach((node) => {
        node.parentId = null;
        roots.push(node);
        place(node, 1, []);
    });

    return roots;
}

/** Every node of the tree by id. */
export function categoryIndex(tree: CategoryNode[]): Map<string, CategoryNode> {
    const index = new Map<string, CategoryNode>();
    const walk = (node: CategoryNode) => {
        index.set(node.id, node);
        node.children.forEach(walk);
    };
    tree.forEach(walk);
    return index;
}

/** A category and every category under it. */
export function descendantIds(node: CategoryNode): string[] {
    return [node.id, ...node.children.flatMap(descendantIds)];
}

/** The category's ancestor at a level (1 at the top), or the category itself when it is at or above it. */
export function ancestorAt(index: Map<string, CategoryNode>, id: string | null | undefined, level: number): CategoryNode | null {
    let node = id ? (index.get(String(id)) ?? null) : null;
    while (node && node.depth > level && node.parentId) {
        node = index.get(node.parentId) ?? null;
    }
    return node;
}

/**
 * A top-level category's items in headings: its own first, then each subcategory's, and under a
 * subcategory its own subcategories', in tree order. Items whose category is not under `top` (or
 * unknown) count as the top category's own. Empty headings are left out.
 */
export function groupByCategory<T>(top: CategoryNode, items: T[], categoryOf: (item: T) => string | null | undefined): CategoryGroup<T>[] {
    const groups: CategoryGroup<T>[] = [];
    const under = new Set(descendantIds(top));
    const own = (node: CategoryNode) => items.filter((item) => {
        const category = categoryOf(item);
        return node === top ? !category || !under.has(String(category)) || String(category) === top.id : String(category) === node.id;
    });
    const walk = (node: CategoryNode, level: number) => {
        const mine = own(node);
        if (mine.length) groups.push({ id: node.id, name: node.name, path: node.path, level, items: mine });
        node.children.forEach((child) => walk(child, level + 1));
    };
    walk(top, 0);
    return groups;
}
