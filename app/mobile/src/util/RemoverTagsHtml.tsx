export const removerTagsHtml = (htmlString: string): string => {
    if (!htmlString) return '';

    return htmlString
        .replace(/<[^>]+>/g, '') 
        .replace(/&nbsp;/g, ' ') 
        .trim();
};