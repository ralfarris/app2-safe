import sanitizeHtml from 'sanitize-html';

// Konfigurasi umum untuk konten yang mengizinkan beberapa format dasar.
const defaultSanitizeOptions = {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {
        'a': ['href', 'target'] 
    },
    disallowedTagsMode: 'discard'
};

export const sanitizeContent = (dirtyHtml) => {
    return sanitizeHtml(dirtyHtml, defaultSanitizeOptions);
}

export const sanitizeBio = (dirtyHtml) => {
    // Untuk bio, izinkan hanya pemformatan teks dasar, tanpa link.
    return sanitizeHtml(dirtyHtml, {
        allowedTags: ['b', 'i', 'em', 'strong'], 
        allowedAttributes: {},
    });
}

export const sanitizeStrict = (dirtyHtml) => {
    return sanitizeHtml(dirtyHtml, {
        allowedTags: [],
        allowedAttributes: {}
    });
}