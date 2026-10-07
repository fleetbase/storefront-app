import {
    faBasketShopping,
    faBroom,
    faCar,
    faCouch,
    faGift,
    faHeartPulse,
    faLaptop,
    faPaw,
    faPersonDress,
    faSeedling,
    faShirt,
    faSpa,
    faTag,
    faTruck,
    faUtensils,
    faWrench,
    faBook,
    faDumbbell,
    faBaby,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/** Keywords (in any supported language) mapped to an icon, checked in order. */
const RULES: Array<[RegExp, IconDefinition]> = [
    [/grocer|supermarket|market|produce|хүнс|продукт/i, faBasketShopping],
    [/electronic|phone|laptop|computer|gadget|электрон|техн/i, faLaptop],
    [/flower|plant|garden|lawn|цэцэг|квіт|сад/i, faSeedling],
    [/gift|бэлэг|подар/i, faGift],
    [/clean|maid|laundry|цэвэрл|приб/i, faBroom],
    [/repair|handyman|plumb|electrician|засвар|ремонт/i, faWrench],
    [/beauty|salon|nail|hair|spa|гоо|красот|салон/i, faSpa],
    [/health|pharma|medic|clinic|эрүүл|эм|аптек|здоров/i, faHeartPulse],
    [/pet|animal|амьтан|тварин/i, faPaw],
    [/fashion|cloth|apparel|shoe|хувцас|одяг/i, faShirt],
    [/women|ladies/i, faPersonDress],
    [/home|furniture|decor|гэр|меблі|дім/i, faCouch],
    [/car|auto|vehicle|машин|авто/i, faCar],
    [/food|restaurant|meal|cafe|bakery|хоол|ресторан|їжа/i, faUtensils],
    [/book|stationery|ном|книг/i, faBook],
    [/sport|fitness|gym|спорт/i, faDumbbell],
    [/baby|kid|child|хүүхэд|дит/i, faBaby],
    [/delivery|courier|logistic|хүргэлт|доставк/i, faTruck],
];

/** A sensible icon for a category without an uploaded icon, from words in its name. */
export function categoryIcon(name: unknown): IconDefinition {
    const text = String(name ?? '');
    return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? faTag;
}
