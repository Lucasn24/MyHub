export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startEmailSyncPoller } = await import("./lib/emailSync");
    startEmailSyncPoller();
  }
}
