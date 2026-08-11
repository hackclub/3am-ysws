import https from "https";

// Exact label confirmed via https://ships.hackclub.com/api/v1/stats
const YSWS_NAME = "3am";

function fetchIPv4(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        family: 4,
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`API Error (${res.statusCode}): ${body}`));
          }
        });
      }
    );
    req.on("error", (err) => reject(err));
    req.end();
  });
}

export async function getYswsStats() {
  try {
    const entries = await fetchIPv4("https://ships.hackclub.com/api/v1/ysws_entries");

    if (!Array.isArray(entries)) {
      console.error("Unexpected Ships API response shape:", entries);
      return { totalProjects: 0, totalHours: 0 };
    }

    const ours = entries.filter(
      (e: any) => (e.ysws || "").toLowerCase() === YSWS_NAME.toLowerCase()
    );

    const totalProjects = ours.length;
    const totalHours = ours.reduce((sum: number, e: any) => sum + (Number(e.hours) || 0), 0);

    return { totalProjects, totalHours };
  } catch (err) {
    console.error("Ships API Error in getYswsStats:", err);
    return { totalProjects: 0, totalHours: 0 };
  }
}
