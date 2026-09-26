import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("../node_modules/@stripe/link-cli/dist/cli.js", import.meta.url));
const fields = "id,status,approval_url,amount,currency,credential_type";

function oneResult(stdout) {
  const parsed = JSON.parse(stdout);
  const result = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!result || typeof result !== "object") throw new Error("Link returned an empty response");
  if (result.code || result.message) throw new Error(`Link: ${result.message ?? result.code}`);
  return result;
}

export async function runLinkCli(args) {
  try {
    const { stdout } = await execFileAsync(process.execPath, [cliPath, ...args], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    return oneResult(stdout);
  } catch (error) {
    // Never include raw CLI output here: future responses may contain payment credentials.
    if (error instanceof SyntaxError) throw new Error("Link returned invalid JSON");
    if (error.code === "ETIMEDOUT") throw new Error("Link request timed out");
    throw new Error(`Link command failed${error.code ? ` (${error.code})` : ""}`);
  }
}

export function createLinkAuthorizer(run = runLinkCli) {
  return {
    async requestApproval({ checkoutId, merchantId, merchantName, merchantUrl, amount, currency, items }) {
      const context =
        `Mosaic test mode checkout ${checkoutId} for ${merchantName}. ` +
        "This is a demo approval for a separate store in one Mosaic cart. " +
        "The underlying payment method will not be charged and no store order is placed at this step.";
      const args = [
        "spend-request", "create",
        "--idempotency-key", `${checkoutId}:${merchantId}`,
        "--merchant-name", merchantName,
        "--merchant-url", merchantUrl,
        "--amount", String(amount),
        "--currency", currency,
        "--context", context,
        "--total", `type:total,display_text:Total,amount:${amount}`,
        "--metadata", `mosaic_checkout_id:${checkoutId}`,
        "--metadata", `mosaic_merchant_id:${merchantId}`,
        "--test",
        "--request-approval",
        "--format", "json",
        "--filter-output", fields,
      ];
      for (const item of items) {
        args.push("--line-item", `name:${item.name},unit_amount:${item.unitAmount},quantity:${item.quantity}`);
      }
      const result = await run(args);
      if (!result.id || result.amount !== amount || result.currency !== currency) {
        throw new Error(`Link approval does not match ${merchantId} total`);
      }
      return {
        id: result.id,
        merchantId,
        amount,
        currency,
        status: result.status,
        approvalUrl: result.approval_url ?? null,
      };
    },

    async getStatus(request) {
      const result = await run([
        "spend-request", "retrieve", request.id,
        "--format", "json",
        "--filter-output", fields,
      ]);
      if (
        result.id !== request.id ||
        result.amount !== request.amount ||
        result.currency !== request.currency
      ) {
        throw new Error(`Link approval does not match ${request.merchantId} total`);
      }
      return { ...request, status: result.status, approvalUrl: result.approval_url ?? request.approvalUrl };
    },
  };
}
