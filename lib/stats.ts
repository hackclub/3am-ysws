import https from "https";

const AIRTABLE_API_KEY = process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const PROJECTS_TABLE_NAME = "YSWS Project Submission";

function airtableFetchIPv4(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        family: 4,
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
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
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return { totalProjects: 0, totalHours: 0 };
  }

  try {
    const encodedProjectsTable = encodeURIComponent(PROJECTS_TABLE_NAME);
    const projectsUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedProjectsTable}`;
    const data = await airtableFetchIPv4(projectsUrl);

    let totalProjects = 0;
    let totalHours = 0;

    if (data?.records && Array.isArray(data.records)) {
      totalProjects = data.records.length;

      for (const rec of data.records) {
        const f = rec.fields;
        const hours = Number(f["Hours"] || f["Hours Spent"] || f["Approved Hours"] || f["Hours Approved"] || 0);
        totalHours += hours;
      }
    }

    return { totalProjects, totalHours };
  } catch (err) {
    console.error("Airtable API Error in getYswsStats:", err);
    return { totalProjects: 0, totalHours: 0 };
  }
}
