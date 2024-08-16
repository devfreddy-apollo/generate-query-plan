import { parse } from "graphql";
import { assertUnreachableOrReturnDefault } from "./assertUnreachable";
import { hasConnectLink } from "./graphqlHelpers";

/**
 * This is a subset of `QueryPlan` from @apollo/query-planner that has been
 * checked to ensure nothing here could be a potential vector for an xss attack,
 * such as type descriptions, etc. Mermaid has no protections against these
 * attacks, so we should make sure any text displayed is safe.
 *
 * When modifying the type here, make sure any additions do not create unsafe
 * surface area.
 */
export interface SafeQueryPlan {
  node: SafePlanNode;
}

// types based on https://github.com/apollographql/federation/blob/main/query-planner-js/src/QueryPlan.ts
interface DeferNode {
  kind: "Defer";
  deferred: {
    node: SafePlanNode | null | undefined;
    // label: string | null | undefined;
  }[];
  primary: { node: SafePlanNode | null | undefined };
}

interface SequenceNode {
  kind: "Sequence";
  nodes: SafePlanNode[];
  // operation: string
}

interface ParallelNode {
  kind: "Parallel";
  nodes: SafePlanNode[];
}

interface FetchNode {
  kind: "Fetch";
  // Service names are subject to a safe regex, defined at
  // https://github.com/mdg-private/monorepo/blob/a470c50262e1a9e71326d2d996a67f436c69784a/registry/src/federationRegistryService/validateUserDefinedString.ts#L11
  // which is enforced in the upsertImplementingServiceAndTrack (and a few
  // other) resolvers.
  serviceName: string;
}

interface FlattenNode {
  kind: "Flatten";
  // This will be either a field name or array index, both of which are safe
  // Field names are required to be valid Graphql 'Name's by the spec
  // (https://spec.graphql.org/draft/#sec-Names) which is a very simple
  // regex. If the sdl is not a valid graphql document we would get errors
  // both loading this page and also creating a query plan.
  path: (string | number)[];
  node: SafePlanNode;
  // operation?: string;
}

interface SubscriptionNode {
  kind: "Subscription";
  primary: FetchNode;
  rest?: SequenceNode;
}

interface ConditionNode {
  kind: "Condition";
}
interface SkipNode extends ConditionNode {
  elseClause: SafePlanNode;
  ifClause?: undefined;
}

interface IncludeNode extends ConditionNode {
  ifClause: SafePlanNode;
  elseClause?: undefined;
}

export type SafePlanNode =
  | DeferNode
  | SequenceNode
  | ParallelNode
  | FetchNode
  | FlattenNode
  | SubscriptionNode
  | SkipNode
  | IncludeNode;

export interface QueryPlanResponse {
  text: string;
  object: SafeQueryPlan;
}

export function isConnectorSubgraphViaName(subgraphName: string) {
  return /[\w-]+\.[\w-]+:/.test(subgraphName);
}

export function isConnectorSubgraphViaSDL(subgraphSdl: string) {
  return subgraphSdl ? hasConnectLink(parse(subgraphSdl)) : false;
}

export function isConnectorSubgraph(
  subgraphName: string,
  subgraphSdl: string | undefined
) {
  return (
    isConnectorSubgraphViaName(subgraphName) ||
    (!!subgraphSdl && isConnectorSubgraphViaSDL(subgraphSdl))
  );
}

/**
 * Traverses the given node returning true if it or its descendants are
 * associated with a connector subgraph. Modeled after
 * https://github.com/mdg-private/studio-ui/blob/main/packages/studio/src/components/queryPlan/queryPlanToMermaid.ts#L17
 */
export function containsConnectorFetch(
  currentNode: SafePlanNode,
  subgraphMap: Record<string, any>
): boolean {
  switch (currentNode.kind) {
    case "Fetch": {
      return isConnectorSubgraph(
        currentNode.serviceName,
        subgraphMap[currentNode.serviceName]?.sdl
      );
    }
    case "Sequence":
    case "Parallel": {
      return currentNode.nodes.some((node) =>
        containsConnectorFetch(node, subgraphMap)
      );
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
      return (currentNode.rest?.nodes ?? []).some((node) =>
        containsConnectorFetch(node, subgraphMap)
      );
    }
    case "Condition": {
      if (!currentNode.elseClause && !currentNode.ifClause) {
        return assertUnreachableOrReturnDefault(currentNode, false);
      }
      return containsConnectorFetch(
        currentNode.elseClause ?? currentNode.ifClause,
        subgraphMap
      );
    }
    default: {
      return assertUnreachableOrReturnDefault(currentNode, false);
    }
  }
}
