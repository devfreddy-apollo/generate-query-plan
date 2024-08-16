import {
  operationFromDocument,
  Supergraph
} from "@apollo/federation-internals";
import { QueryPlanner, prettyFormatQueryPlan } from "@apollo/query-planner";
import { Command, Option } from "clipanion";
import { parse } from "graphql";
import { readFile } from "fs/promises";
import { GraphQLClient } from "graphql-request";
import { getSdk } from "../studio/graphql.js";
import { queryPlanToMermaid } from "../studio/queryPlanToMermaid/queryPlanToMermaid.js";
import {
  queryPlanToMermaidInk,
  queryPlanToKroki,
} from "../studio/queryPlanToMermaid/imageUrlService.js";

export class DefaultCommand extends Command {
  supergraph = Option.String("--supergraph");

  graphref = Option.String("--graphref");

  operation = Option.String("--operation", { required: true });

  pretty = Option.Boolean("--pretty");

  sudo = Option.Boolean("--sudo");

  skipLog = Option.Boolean("--skipLog");

  mermaid = Option.String("--mermaid");

  async execute() {
    if (this.supergraph && this.graphref) {
      this.context.stderr.write(
        "invalid request: set only one of --supergraph or --graphref"
      );
      process.exit(1);
    }

    const result = this.supergraph
      ? await fetchSupergraphFromFile(this.supergraph)
      : this.graphref
        ? await fetchSupergraphFromStudio(this.graphref, this.sudo ?? false)
        : null;

    if (!result) {
      this.context.stderr.write("cannot load supergraph");
      process.exit(1);
    }

    const operation = await readFile(this.operation, "utf-8");

    const queryPlan = await generateQueryPlan(result, operation);

    if (this.skipLog) {
      return;
    }

    if (this.pretty) {
      this.context.stdout.write(prettyFormatQueryPlan(queryPlan));
    } else {
      this.context.stdout.write(JSON.stringify(queryPlan, null, 2));
      this.context.stdout.write("\n");
    }

    if (this.mermaid) {
      const safeQueryPlan = queryPlan ? (queryPlan) : undefined;
      // @ts-ignore
      const mermaidPlanNodeString = queryPlanToMermaid(safeQueryPlan);

      const warning = `
        --- Warning: This URL is not associated with Apollo GraphQL, visit at your own discretion. ---
        --- Visiting this link will pass the encoded mermaid textual representation of the query plan, base64 encoded, to the url below. ---
      `;

      switch (this.mermaid) {
        case "mermaidink":
          this.context.stdout.write("To view a generated image of your query plan visit: \n");
          this.context.stdout.write("    - " + queryPlanToMermaidInk(mermaidPlanNodeString));
          this.context.stdout.write(warning);
          break;
        case "kroki":
          this.context.stdout.write("To view a generated image of your query plan visit: \n");
          this.context.stdout.write("    - " + queryPlanToKroki(mermaidPlanNodeString));
          this.context.stdout.write(warning);
          break;
        case 'mmd':
          this.context.stdout.write("Mermaid Markdown:");
          this.context.stdout.write(mermaidPlanNodeString);
          break;
        default:
          this.context.stdout.write(`
            Error: --mermaid flag set incorrectly. Please pass in one of the following options:
            - "--mermaid mmd" for Mermaid Markdown
            - "--mermaid mermaidink" for a link to an image of your query plan on https://mermaid.ink
            - "--mermaid kroki" for a link to an image of your query plan on https://kroki.io
          `);
      }
    }
  }
}

/**
 * @param {import("@apollo/federation-internals").Supergraph} supergraph
 * @param {string} operationDoc
 * @param {string} [operationName]
 */
export async function generateQueryPlan(supergraph, operationDoc, operationName) {
  const documentNode = parse(operationDoc);
  const operation = operationFromDocument(supergraph.schema, documentNode, {
    operationName,
  });
  const queryPlanner = new QueryPlanner(supergraph);
  console.time('Query Plan');
  const plan =  queryPlanner.buildQueryPlan(operation);
  console.timeEnd('Query Plan');
  return plan;
}

/**
 * @param {string} file
 */
async function fetchSupergraphFromFile(file) {
  return Supergraph.build(await readFile(file, "utf-8"));
}

/**
 * @param {string} ref
 * @param {boolean} sudo
 */
async function fetchSupergraphFromStudio(ref, sudo) {
  const apiKey = process.env.APOLLO_KEY;
  if (!apiKey) {
    throw new Error("missing APOLLO_KEY");
  }

  const client = new GraphQLClient(
    "https://graphql.api.apollographql.com/api/graphql",
    {
      headers: {
        "x-api-key": apiKey,
        ...(sudo ? { "apollo-sudo": String(sudo) } : {}),
      },
    }
  );

  const sdk = getSdk(client);

  const resp = await sdk.SupergraphForGraphRef({ ref });

  if (resp.variant?.__typename !== "GraphVariant") {
    return null;
  }

  if (
    resp.variant.latestApprovedLaunch?.build?.result?.__typename !==
    "BuildSuccess"
  ) {
    return null;
  }

  return Supergraph.build(
    resp.variant.latestApprovedLaunch.build.result.coreSchema.coreDocument
  );
}
