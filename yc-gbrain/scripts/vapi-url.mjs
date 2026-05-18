export function buildPublicUrlWithToken(url, token) {
  const next = new URL(url);
  if (token) next.searchParams.set("token", token);
  return next.toString();
}

export function buildToolServerUrl(templateUrl, publicUrl, token) {
  const base = publicUrl.replace(/\/$/, "");
  const url = templateUrl.replace("https://YOUR_PUBLIC_URL", base);
  return buildPublicUrlWithToken(url, token);
}

export function applyPublicUrlToTools(tools, publicUrl, token) {
  return tools.map((tool) => ({
    ...tool,
    server: tool.server?.url
      ? { ...tool.server, url: buildToolServerUrl(tool.server.url, publicUrl, token) }
      : tool.server
  }));
}
