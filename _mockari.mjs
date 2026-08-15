import { createHmac } from "node:crypto";
import { createServer } from "node:http";

const SECRET = "whsec_test";
const server = createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const expected = createHmac("sha256", SECRET).update(raw, "utf8").digest("hex");
    const got = req.headers["x-ari-signature"];
    if (got !== expected) {
      res.writeHead(401).end(JSON.stringify({ error: "bad signature" }));
      return;
    }
    const body = JSON.parse(raw);
    const id = body.external_id ?? "";
    if (req.url.endsWith("/withdraw")) {
      if (id === "gone") return res.writeHead(404).end("{}");
      return res.writeHead(200).end(JSON.stringify({ status: "withdrawn" }));
    }
    if (id === "dupe") return res.writeHead(409).end("{}");
    if (id === "bad")
      return res
        .writeHead(422)
        .end(JSON.stringify({ field: "thumbnail_url", message: "thumbnail is unreachable" }));
    if (id === "boom") return res.writeHead(500).end("{}");
    res.writeHead(202).end(JSON.stringify({ id: "AR-1" }));
  });
});
server.listen(4111, () => console.log("mock ari on 4111"));
