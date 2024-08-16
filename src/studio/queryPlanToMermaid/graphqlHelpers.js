/**
 * Finds any directives matching the directiveName on schema definition or
 * schema extension nodes.
 * @returns An array of DirectiveNode matching directiveName.
 */
export function getSchemaDirectives(documentNode, directiveName) {
    return documentNode.definitions.flatMap((def) => def.kind === "SchemaDefinition" || def.kind === "SchemaExtension"
        ? def.directives?.filter((directive) => directive.name.value === directiveName) ?? []
        : []);
}
/**
 * Whether the given schema definition has a link directive which imports
 * connect.
 */
export function hasConnectLink(documentNode) {
    return getSchemaDirectives(documentNode, "link").some((linkDirective) => {
        const urlArg = linkDirective.arguments?.find((arg) => arg.name.value === "url")?.value;
        return (urlArg?.kind === "StringValue" &&
            urlArg.value.startsWith("https://specs.apollo.dev/connect/v"));
    });
}
