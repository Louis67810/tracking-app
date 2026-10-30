import { createServer } from "node:http";
import handler from "../api/coach.js";

createServer(async (req, res) => {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };
  if (req.url !== "/api/coach")
    return res.status(404).json({ error: "Not found" });
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 3_000_000)
      return res
        .status(413)
        .json({ allowed: false, error: "Pièce jointe trop volumineuse." });
    chunks.push(chunk);
  }
  req.body = Buffer.concat(chunks).toString();
  await handler(req, res);
}).listen(3001, "127.0.0.1", () =>
  console.log("Focus API: http://127.0.0.1:3001/api/coach"),
);
