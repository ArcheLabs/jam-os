import { action, fixedBytes, wallet } from "jam";
import { probeDoomNative } from "native:doom";

export const probeDoomNativeAction = action({
  auth: wallet(),
  input: { runId: fixedBytes(32) },
  execute(_ctx, input) {
    probeDoomNative(input.runId);
  },
});
