const stripHtml = (html = '') => {
    if (typeof html === 'string') {
        return html.replace(/<[^>]*>?/gm, '');
    }
    
    return html;
};

export default stripHtml;