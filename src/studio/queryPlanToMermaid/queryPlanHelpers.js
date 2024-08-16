import { parse } from "graphql";
import { assertUnreachableOrReturnDefault } from "./assertUnreachable";
import { hasConnectLink } from "./graphqlHelpers";
export function isConnectorSubgraphViaName(subgraphName) {
    return /[\w-]+\.[\w-]+:/.test(subgraphName);
}
export function isConnectorSubgraphViaSDL(subgraphSdl) {
    return subgraphSdl ? hasConnectLink(parse(subgraphSdl)) : false;
}
export function isConnectorSubgraph(subgraphName, subgraphSdl) {
    return (isConnectorSubgraphViaName(subgraphName) ||
        (!!subgraphSdl && isConnectorSubgraphViaSDL(subgraphSdl)));
}
/**
 * Traverses the given node returning true if it or its descendants are
 * associated with a connector subgraph. Modeled after
 * https://github.com/mdg-private/studio-ui/blob/main/packages/studio/src/components/queryPlan/queryPlanToMermaid.ts#L17
 */
export function containsConnectorFetch(currentNode, subgraphMap) {
    switch (currentNode.kind) {
        case "Fetch": {
            return isConnectorSubgraph(currentNode.serviceName, subgraphMap[currentNode.serviceName]?.sdl);
        }
        case "Sequence":
        case "Parallel": {
            return currentNode.nodes.some((node) => containsConnectorFetch(node, subgraphMap));
        }
        case "Flatten": {
            return containsConnectorFetch(currentNode.node, subgraphMap);
        }
        case "Defer": {
            return [
                currentNode.primary.node,
                ...currentNode.deferred.map(({ node }) => node),
            ].some((node) => !!node && containsConnectorFetch(node, subgraphMap));
        }
        case "Subscription": {
            return (currentNode.rest?.nodes ?? []).some((node) => containsConnectorFetch(node, subgraphMap));
        }
        case "Condition": {
            if (!currentNode.elseClause && !currentNode.ifClause) {
                return assertUnreachableOrReturnDefault(currentNode, false);
            }
            return containsConnectorFetch(currentNode.elseClause ?? currentNode.ifClause, subgraphMap);
        }
        default: {
            return assertUnreachableOrReturnDefault(currentNode, false);
        }
    }
}
