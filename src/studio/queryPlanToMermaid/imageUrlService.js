import pako from "pako";
export const queryPlanToMermaidInk = (queryPlan = "") => {
    // Encode the graph string to base64
    let graphBytes = new TextEncoder().encode(queryPlan);
    let base64String = btoa(String.fromCharCode(...graphBytes));
    // Create the image URL
    let mermaidInkUrl = "https://mermaid.ink/img/" + base64String;
    return mermaidInkUrl;
};
export const queryPlanToKroki = (queryPlan = "") => {
    const data = Buffer.from(queryPlan, "utf8");
    const compressed = pako.deflate(data, { level: 9 });
    const result = Buffer.from(compressed)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    let mermaidKrokiUrl = "https://kroki.io/mermaid/svg/" + result;
    return mermaidKrokiUrl;
};
