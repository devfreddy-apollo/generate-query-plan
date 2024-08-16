import { DirectiveNode, DocumentNode } from 'graphql';
/**
 * Finds any directives matching the directiveName on schema definition or
 * schema extension nodes.
 * @returns An array of DirectiveNode matching directiveName.
 */
export declare function getSchemaDirectives(documentNode: DocumentNode, directiveName: string): DirectiveNode[];
/**
 * Whether the given schema definition has a link directive which imports
 * connect.
 */
export declare function hasConnectLink(documentNode: DocumentNode): boolean;
