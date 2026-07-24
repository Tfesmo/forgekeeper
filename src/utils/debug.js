import debugPkg from "debug";

const NAMESPACE = "forgekeeper";

function createDebug(tag) {
  return debugPkg(`${NAMESPACE}:${tag}`);
}

const debug = {
  sse: createDebug("sse"),
  http: createDebug("http"),
  server: createDebug("server"),
  pipeline: createDebug("pipeline"),
  vue: createDebug("vue"),
  create: createDebug,
};

export { debug };
