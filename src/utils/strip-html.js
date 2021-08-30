const stripHtml = (html) => html.replace(/<[^>]*>?/gm, '');

export default stripHtml;