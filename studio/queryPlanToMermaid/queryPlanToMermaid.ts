import { SafePlanNode, SafeQueryPlan } from "./queryPlanHelpers.js";
import { assertUnreachableOrReturnDefault } from "./assertUnreachable.js";

interface NodeFormatterOutput {
  nodeText: string;
  startHash?: string;
  endHash: string[];
}

function hash(): string {
  return (Date.now() + Math.random().toString()).replaceAll(".", "");
}

function handleUnknownNode(currentNode: never) {
  const nodeHash = hash();
  const unknownNode: NodeFormatterOutput = {
    startHash: nodeHash,
    endHash: [nodeHash],
    nodeText: `${nodeHash}("Unknown")`,
  };
  return assertUnreachableOrReturnDefault(currentNode, unknownNode);
}

function processNode(currentNode: SafePlanNode): NodeFormatterOutput {
  switch (currentNode.kind) {
    case "Sequence": {
      const processedChildren = currentNode.nodes.map(processNode);
      const firstNode = processedChildren[0];
      const lastNode = processedChildren.slice(-1)[0];
      return {
        startHash: firstNode?.startHash,
        endHash: lastNode?.endHash ?? [],
        nodeText: processedChildren
          .map((processedChild, i) => {
            if (i === 0) return processedChild.nodeText;
            const previousNode = processedChildren[i - 1];
            return `
              ${previousNode?.endHash
                ?.map((h) => `${h} --> ${processedChild.startHash}`)
                .join("\n")}
              ${processedChild.nodeText}
            `;
          })
          .join(""),
      };
    }
    case "Parallel": {
      const nodeHash = hash();
      const processedChildren = currentNode.nodes.map(processNode);
      return {
        startHash: nodeHash,
        endHash: processedChildren.flatMap((node) => node.endHash ?? []),
        nodeText: `
          ${nodeHash}("Parallel")
          ${processedChildren
            .map((processedChild) => {
              return `
                ${nodeHash} --> ${processedChild.startHash}
                ${processedChild.nodeText}
              `;
            })
            .join("")}
        `,
      };
    }
    case "Fetch": {
      // TODO (jason) get tooltips to work here, seems to not be creating the
      // node at all. Should create node with class .mermaidTooltip
      // const tooltip = currentNode.operation
      //   ? `${currentNodeHash}_operation["${print(
      //       parse(currentNode.operation),
      //     ).replaceAll('\n', '<br/>')}"] -...- ${currentNodeHash}`
      //   : 'click ${nodeHash} unDefinedCallback "TooltipContents"';
      const nodeHash = hash();
      return {
        startHash: nodeHash,
        endHash: [nodeHash],
        nodeText: `${nodeHash}("Fetch (${
          currentNode.serviceName.split("?")[0] // adding support for connectors to strip args out of the path, which represents a subgraph
        })")`,
      };
    }
    case "Flatten": {
      const nodeHash = hash();
      const processedChild = processNode(currentNode.node);

      return {
        startHash: processedChild.startHash,
        endHash: [nodeHash],
        nodeText: `
          ${nodeHash}("Flatten (${currentNode.path
          .join(",")
          .replaceAll("@", "[]")})")

          ${processedChild.endHash
            .map((h) => `${h} --> ${nodeHash}`)
            .join("\n")}

          ${processedChild.nodeText}
        `,
      };
    }
    case "Defer": {
      const nodeHash = hash();
      const primaryHash = hash();

      const primaryProcessed =
        currentNode.primary.node && processNode(currentNode.primary.node);

      return {
        startHash: nodeHash,
        endHash: [nodeHash],
        nodeText: `
          ${nodeHash}("Defer")

          ${nodeHash} --> ${primaryHash}
          ${primaryHash}(Primary)
          ${
            primaryProcessed
              ? `
                  ${primaryHash} --> ${primaryProcessed.startHash}
                  ${primaryProcessed.nodeText}
                `
              : ""
          }

          ${currentNode.deferred
            .map((node) => {
              const deferredHash = hash();
              const processedChild = node.node && processNode(node.node);
              return `
                ${nodeHash} --> ${deferredHash}
                ${deferredHash}("Deferred${
                ""
                // can we safely render this? we need to make sure this doesn't open us up to attacks
                // node.label ? `(${node.label})` : ''
              }")
                ${
                  processedChild
                    ? `
                        ${deferredHash} --> ${processedChild.startHash}
                        ${processedChild.nodeText}
                      `
                    : ""
                }

              `;
            })
            .join("")}
        `,
      };
    }
    case "Subscription": {
      const nodeHash = hash();
      const processedChildren = (currentNode.rest?.nodes ?? []).map(
        processNode
      );
      return {
        startHash: nodeHash,
        endHash: processedChildren.flatMap((node) => node.endHash ?? []),
        nodeText: `
          ${nodeHash}("Fetch (${currentNode.primary.serviceName})")
          ${processedChildren
            .map((processedChild) => {
              return `
                ${nodeHash} --> ${processedChild.startHash}
                ${processedChild.nodeText}
              `;
            })
            .join("")}
        `,
      };
    }
    case "Condition": {
      const nodeHash = hash();

      const isSkip = !!currentNode.elseClause;
      if (!isSkip && !currentNode.ifClause) {
        return handleUnknownNode(currentNode);
      }
      const primaryProcessed = processNode(
        currentNode.elseClause ?? currentNode.ifClause
      );

      return {
        startHash: nodeHash,
        endHash: [nodeHash],
        nodeText: `
          ${nodeHash}("Condition(${isSkip ? "Skip" : "Include"})")
          ${`
            ${nodeHash} --> ${primaryProcessed.startHash}
            ${primaryProcessed.nodeText}
          `}
        `,
      };
    }
    default: {
      return handleUnknownNode(currentNode);
    }
  }
}

export function queryPlanToMermaid(queryPlan: SafeQueryPlan) {
  return `
    graph TD
      ${processNode(queryPlan.node).nodeText}
  `;
}
