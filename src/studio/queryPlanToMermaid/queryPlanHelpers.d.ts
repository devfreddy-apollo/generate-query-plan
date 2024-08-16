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
interface DeferNode {
    kind: "Defer";
    deferred: {
        node: SafePlanNode | null | undefined;
    }[];
    primary: {
        node: SafePlanNode | null | undefined;
    };
}
interface SequenceNode {
    kind: "Sequence";
    nodes: SafePlanNode[];
}
interface ParallelNode {
    kind: "Parallel";
    nodes: SafePlanNode[];
}
interface FetchNode {
    kind: "Fetch";
    serviceName: string;
}
interface FlattenNode {
    kind: "Flatten";
    path: (string | number)[];
    node: SafePlanNode;
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
export type SafePlanNode = DeferNode | SequenceNode | ParallelNode | FetchNode | FlattenNode | SubscriptionNode | SkipNode | IncludeNode;
export interface QueryPlanResponse {
    text: string;
    object: SafeQueryPlan;
}
export declare function isConnectorSubgraphViaName(subgraphName: string): boolean;
export declare function isConnectorSubgraphViaSDL(subgraphSdl: string): boolean;
export declare function isConnectorSubgraph(subgraphName: string, subgraphSdl: string | undefined): boolean;
/**
 * Traverses the given node returning true if it or its descendants are
 * associated with a connector subgraph. Modeled after
 * https://github.com/mdg-private/studio-ui/blob/main/packages/studio/src/components/queryPlan/queryPlanToMermaid.ts#L17
 */
export declare function containsConnectorFetch(currentNode: SafePlanNode, subgraphMap: Record<string, any>): boolean;
export {};
