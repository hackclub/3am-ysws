import https from "https";

const AIRTABLE_API_KEY = process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;

const USERS_TABLE_NAME = "Shop Data :D";
const PROJECTS_TABLE_NAME = "YSWS Project Submission";
const ORDERS_TABLE_NAME = "Orders";

export interface UserProject {
  id: string;
  name: string;
  status: "Approved" | "In Review" | "Rejected" | string;
  hours?: number;
  screenshotUrl?: string;
  playableUrl?: string;
  codeUrl?: string;
  submittedAt?: string;
  userEmail?: string;
}

function airtableFetchIPv4(url: string, options: { method?: string; body?: string } = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: options.method || "GET",
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
              reject(new Error("Failed to parse response"));
            }
          } else {
            reject(new Error(`API Error (${res.statusCode}): ${body}`));
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    if (options.body) req.write(options.body);
    req.end();
  });
}

export async function fetchUserData(email: string) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return { approvedHours: 0, coffeeBeans: 0, coffeeBeansSpent: 0, userRecordId: null, projects: [] };
  }

  const cleanEmail = email.trim().toLowerCase();
  const encodedUsersTable = encodeURIComponent(USERS_TABLE_NAME);
  const userFilter = encodeURIComponent(`LOWER({Email}) = '${cleanEmail}'`);
  const usersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedUsersTable}?filterByFormula=${userFilter}`;

  let approvedHours = 0;
  let coffeeBeans = 0;
  let coffeeBeansSpent = 0;
  let userRecordId: string | null = null;
  let linkedProjectNames: string[] = [];

  try {
    const userData = await airtableFetchIPv4(usersUrl);
    if (userData.records && userData.records.length > 0) {
      const rec = userData.records[0];
      const userFields = rec.fields;
      userRecordId = rec.id;
      approvedHours = Number(userFields["Hours Approved"] ?? userFields["Approved Hours"] ?? 0);
      coffeeBeans = Number(userFields["Coffee Beans "] ?? userFields["Coffee Beans"] ?? 0);
      coffeeBeansSpent = Number(userFields["Coffee Beans Spent"] ?? 0);

      const rawSubmissions = userFields["YSWS Project Submission"];
      if (Array.isArray(rawSubmissions)) {
        linkedProjectNames = rawSubmissions.map((s: any) => String(s).trim().toLowerCase());
      } else if (typeof rawSubmissions === "string") {
        linkedProjectNames = [rawSubmissions.trim().toLowerCase()];
      }
    }
  } catch (err) {
    console.error("Error loading user balance:", err);
  }

  // Fetch Projects (Approved + In Review)
  const projects: UserProject[] = [];
  try {
    const encodedProjectsTable = encodeURIComponent(PROJECTS_TABLE_NAME);
    const projectsUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedProjectsTable}`;
    const projectData = await airtableFetchIPv4(projectsUrl);

    if (projectData?.records) {
      for (const rec of projectData.records) {
        const f = rec.fields;
        
        const recEmail = String(f["Email"] || f["User Email"] || f["Submitted By"] || "").trim().toLowerCase();
        const projName = String(f["Project Name"] || f["Name"] || f["Title"] || f["YSWS Project Submission"] || "Untitled Project").trim();
        const rawStatus = String(f["Status"] || f["Project Status"] || f["Review Status"] || "In Review").trim();

        const isEmailMatch = recEmail === cleanEmail || (recEmail.length > 0 && cleanEmail.includes(recEmail));
        const isLinkedMatch = linkedProjectNames.some((lp) => lp.includes(projName.toLowerCase()) || projName.toLowerCase().includes(lp) || lp.includes(rec.id.toLowerCase()));

        if (isEmailMatch || isLinkedMatch) {
          let screenshot = "";
          if (Array.isArray(f["Screenshot"]) && f["Screenshot"][0]?.url) {
            screenshot = f["Screenshot"][0].url;
          } else if (Array.isArray(f["Screenshots"]) && f["Screenshots"][0]?.url) {
            screenshot = f["Screenshots"][0].url;
          } else if (typeof f["Screenshot"] === "string") {
            screenshot = f["Screenshot"];
          }

          // Normalize status
          let statusStr = "In Review";
          if (rawStatus.toLowerCase().includes("approve") || rawStatus.toLowerCase().includes("accept") || isLinkedMatch) {
            statusStr = "Approved";
          } else if (rawStatus.toLowerCase().includes("reject")) {
            statusStr = "Rejected";
          }

          projects.push({
            id: rec.id,
            name: projName,
            status: statusStr,
            hours: Number(f["Hours"] || f["Hours Spent"] || 0),
            screenshotUrl: screenshot || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
            playableUrl: f["Playable URL"] || f["Demo URL"] || f["Live URL"] || f["URL"] || "",
            codeUrl: f["Code URL"] || f["GitHub URL"] || f["Repository"] || "",
            submittedAt: f["Submitted At"] || rec.createdTime,
            userEmail: recEmail
          });
        }
      }
    }
  } catch (err) {
    console.error("Error loading projects:", err);
  }

  return { approvedHours, coffeeBeans, coffeeBeansSpent, userRecordId, projects };
}

export const fetchUserBalance = fetchUserData;

// Fetch all community approved projects for the Explore page
export async function fetchAllCommunityProjects(): Promise<UserProject[]> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) return [];

  const communityProjects: UserProject[] = [];
  try {
    const encodedProjectsTable = encodeURIComponent(PROJECTS_TABLE_NAME);
    const projectsUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedProjectsTable}`;
    const projectData = await airtableFetchIPv4(projectsUrl);

    if (projectData?.records) {
      for (const rec of projectData.records) {
        const f = rec.fields;
        const projName = String(f["Project Name"] || f["Name"] || f["Title"] || "Untitled Project").trim();
        let screenshot = "";

        if (Array.isArray(f["Screenshot"]) && f["Screenshot"][0]?.url) {
          screenshot = f["Screenshot"][0].url;
        } else if (typeof f["Screenshot"] === "string") {
          screenshot = f["Screenshot"];
        }

        communityProjects.push({
          id: rec.id,
          name: projName,
          status: "Approved",
          screenshotUrl: screenshot || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
          playableUrl: f["Playable URL"] || f["Demo URL"] || f["Live URL"] || f["URL"] || "",
          codeUrl: f["Code URL"] || f["GitHub URL"] || f["Repository"] || "",
          userEmail: String(f["Email"] || f["User Email"] || "Community Builder")
        });
      }
    }
  } catch (err) {
    console.error("Error fetching community projects:", err);
  }

  return communityProjects;
}

export async function updateUserSpentBeans(userRecordId: string, additionalSpent: number) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !userRecordId) return;

  const encodedTable = encodeURIComponent(USERS_TABLE_NAME);
  const getUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedTable}/${userRecordId}`;

  try {
    const recordData = await airtableFetchIPv4(getUrl);
    const liveCurrentSpent = Number(recordData.fields?.["Coffee Beans Spent"] || 0);
    const newSpentTotal = liveCurrentSpent + additionalSpent;

    const patchPayload = JSON.stringify({
      fields: {
        "Coffee Beans Spent": newSpentTotal,
      },
    });

    await airtableFetchIPv4(getUrl, { method: "PATCH", body: patchPayload });
  } catch (err) {
    console.error("Error updating spent beans:", err);
  }
}

export async function createOrderRecord(orderData: {
  userEmail: string;
  items: Array<{ id: string; name: string; quantity: number; costHours: number; costBeans: number }>;
  totalHours: number;
  totalBeans: number;
  customNotes?: string;
}) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error("Unable to process order at this moment.");
  }

  const encodedTable = encodeURIComponent(ORDERS_TABLE_NAME);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedTable}`;

  const formattedDetails = orderData.items
    .map((item) => `• ${item.name} × ${item.quantity} (${item.costHours * item.quantity} hrs, ${item.costBeans * item.quantity} beans)`)
    .join("\n");

  const payload = JSON.stringify({
    records: [
      {
        fields: {
          "User Email": orderData.userEmail.trim().toLowerCase(),
          "Total Hours": orderData.totalHours,
          "Total Beans": orderData.totalBeans,
          "Order Details": formattedDetails,
          "Notes": orderData.customNotes || "",
          "Order Status": "Pending",
          "Submitted At": new Date().toISOString(),
        },
      },
    ],
  });

  return await airtableFetchIPv4(url, { method: "POST", body: payload });
}
