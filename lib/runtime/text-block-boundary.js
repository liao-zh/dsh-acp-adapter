/** Delimit generated text blocks for consumers that concatenate adjacent block content. */
export const generatedContextSeparator = '\n\n';
export function generatedContextBlock(text) {
    return `${generatedContextSeparator}${text}${generatedContextSeparator}`;
}
//# sourceMappingURL=text-block-boundary.js.map