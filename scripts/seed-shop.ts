import { inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { items } from "@/lib/db/schema";

const CATALOGUE = [
  {
    name: "book grant",
    description: "$5 per hour coded, toward whatever book you're into",
    cost: 5,
    imageUrl: "https://www.worthing.in/cdn/shop/products/IMG_20210820_170902.jpg?v=1629459850",
    position: 1,
  },
  {
    name: "hardware component grant",
    description: "$5 grant to pick up hardware components for your dream project",
    cost: 5,
    imageUrl: "https://cdn.hackclub.com/019fd377-3649-75be-bf89-69efc5540c5c/image.png",
    position: 2,
  },
  {
    name: "hosting and domain grant",
    description: "$5 towards your project actually living on the internet",
    cost: 5,
    imageUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8YgHI-eO8T_VSS-6tA50IaVhsPWlC6CtM-WS7HRzEkA&s=10",
    position: 3,
  },
  {
    name: "$10 coffee card",
    description: "for the next 3 am session, whenever it is",
    cost: 10,
    imageUrl: "https://cdn.hackclub.com/019fa456-b4dd-7a73-b639-80828e63b63c/image.png",
    position: 4,
  },
  {
    name: "$10 peripheral device grant",
    description:
      "get a $10  grant, level up your setup so your fingers and eyes do not completely give up on you at 3am",
    cost: 10,
    imageUrl:
      "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQanU0gF4QKpnvIgXnmJUeXQaI5NMaWyK6V-1rBVa_j6-A02MkS5HHPunbs1giqx9eRX24aUwAi7LwkTIqwEhmP4kNYda5OAZX-to5HLSdyUmuyT12EAuEldp8",
    position: 5,
  },
  {
    name: "snacks for the night",
    description: "brain food for the night, stack it and never code on an empty stomach again",
    cost: 10,
    imageUrl:
      "https://www.foodandwine.com/thmb/YxTpbJjamzotxmM7XzYEq_rloNE=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Here-Are-the-Most-Popular-Snacks-in-America-Per-State-6ada7279c64a46898b6ec09ad083f9f2.jpg",
    position: 6,
  },
  {
    name: "$10 ai and hosting grant",
    description:
      "a $10 grant for your favorite AI APIs or hosting services - stack as many as you need",
    cost: 10,
    imageUrl: "https://user-cdn.hackclub-assets.com/019fc98d-8ee8-7350-b61e-8d8ac6a72ede/ai.webp",
    position: 7,
  },
  {
    name: "$20 horror game grant",
    description: "for when #3am ends and you have nothing to do at 3am",
    cost: 20,
    imageUrl: "https://cdn.hackclub.com/019fe616-d1bd-7c38-8869-bcf4d63b6e71/image.png",
    position: 8,
  },
  {
    name: "mp3 player grant",
    description:
      "get $20 grant to lock in with your favorite beats without your phone distracting you 24/7",
    cost: 20,
    imageUrl:
      "https://i5.walmartimages.com/seo/TOPRenddon-32GB-Portable-MP3-Player-with-LCD-Screen-Ultra-Compact-Metal-Music-Player-USB-Rechargeable-SD-TF-Card-Reader-Audio-Player_fbcbfc6a-3222-41a9-8d8e-fcda8077fdb5.05a535eb8cadf1e8e52c7e97bac9d316.jpeg?odnHeight=573&odnWidth=573&odnBg=FFFFFF",
    position: 9,
  },
  {
    name: "brew machine grant",
    description:
      "because instant coffee is a crime against humanity and your all-nighters deserve better",
    cost: 20,
    imageUrl: "https://cdn.hackclub.com/019fe60b-15b1-705a-9bbc-ee6358328eae/image.png",
    position: 10,
  },
  {
    name: "google play developer account",
    description:
      "a $25 grant to cover the one-time registration fee to publish your apps on the google play store",
    cost: 25,
    imageUrl:
      "https://cdn.hackclub.com/019fc98d-90a6-7e78-bfff-d55d6b263f27/en_badge_web_generic.png",
    position: 11,
  },
  {
    name: "blue light glasses",
    description: "your eyes will thank you around hour 4",
    cost: 30,
    imageUrl: "https://cdn.hackclub.com/019fa458-4a5e-7024-941f-dc038a93780b/image.png",
    position: 12,
  },
  {
    name: "minecraft",
    description: "because sometimes you want to build without a compiler yelling at you",
    cost: 40,
    imageUrl: "https://hackyeah.hackclub.com/minecraft.png",
    position: 13,
  },
  {
    name: "$50 e-reader grant",
    description:
      "a $50 grant toward any e-reader of your choice - stack multiple to cover the full cost",
    cost: 50,
    imageUrl: "https://cdn.hackclub.com/019fc991-f6bc-77f7-a2f8-994b155053ac/image.png",
    position: 14,
  },
  {
    name: "logitech mx master 3s",
    description:
      "ergonomic productivity mouse with quiet clicks, electromagnetic scrolling, and an 8K DPI sensor",
    cost: 100,
    imageUrl: "https://user-cdn.hackclub-assets.com/019fc991-fb83-76a0-bade-ea4a310811d2/image.png",
    position: 15,
  },
  {
    name: "laptop grant",
    description: "$100 towards a new laptop, stacks every 20 hours so keep going!",
    cost: 100,
    imageUrl:
      "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcQSHergPPhI3EYYWRS6FwpbH-wSfz1POogGOgIgTpYIigBAYwfWOkTTAF1PGU7h28FY9hsLWYcXp4aN93A4qt5VnOmFWRRfwX_0uX6Rz-a_Ag6qfa2UUetY7Q",
    position: 16,
  },
  {
    name: "$100 telescope grant",
    description: "@hridhaan's actual telescope in the pic :D",
    cost: 100,
    imageUrl:
      "https://media.licdn.com/dms/image/v2/D4D22AQFtGTkok3Eniw/feedshare-shrink_800/feedshare-shrink_800/0/1701798439889?e=1787788800&v=beta&t=2lMisyqKuoQLh-8q9orDyJJVBltM6Vkp_y_ODux5I2E",
    position: 17,
  },
  {
    name: "apple pencil",
    description:
      "turn your iPad into an actual whiteboard instead of just a very expensive YouTube machine",
    cost: 130,
    imageUrl: "https://cdn.hackclub.com/019fe615-bd5b-7ea1-853d-2b7ce27dcab8/image.png",
    position: 18,
  },
  {
    name: "Sony WH-CH720N",
    description: "noise cancelling for when your house isn't as quiet as 3 AM should be",
    cost: 150,
    imageUrl: "https://hackyeah.hackclub.com/headphones.webp",
    position: 19,
  },
  {
    name: "GTA VI",
    description: "for everyone who stayed up way past 3AM to earn this one",
    cost: 155,
    imageUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIdPoIO0vVg-60XUh_XWz15aRIMLN1WKbOdAGD2wWGLA&s=10",
    position: 20,
  },
  {
    name: "flipper zero",
    description:
      "a pocket-sized multi-tool for educational usage and exploring hardware, RFID, NFC, and radio protocols",
    cost: 200,
    imageUrl: "https://user-cdn.hackclub-assets.com/019fc98d-8cd3-7f91-b55a-5f20132561e1/image.png",
    position: 21,
  },
  {
    name: "meta smart glasses",
    description: "capture video, stream music, and build AI projects right from your frame.",
    cost: 300,
    imageUrl:
      "https://user-cdn.hackclub-assets.com/019fc991-f942-75a1-a5e9-b38dd99fc9d8/lookaside.fbsbx.webp",
    position: 22,
  },
  {
    name: "iPad (10th Gen)",
    description: "for sketching, notes, or coding from the couch instead of your desk",
    cost: 325,
    imageUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQo9va3cCWu3j-TtW7XKGbor2KuhKfez3-DRzWlcNOZrQ&s=10",
    position: 23,
  },
  {
    name: "Meta Quest 3S (128GB)",
    description: "entry-level mixed reality headset powered by the snapdragon XR2 Gen 2 chip.",
    cost: 350,
    imageUrl: "https://user-cdn.hackclub-assets.com/019fc98d-9272-7302-8ec7-cc4ff5f5161b/image.png",
    position: 24,
  },
];

async function seed() {
  const db = getDb();
  const names = CATALOGUE.map((item) => item.name);

  const existing = await db
    .select({ name: items.name })
    .from(items)
    .where(inArray(items.name, names));

  const known = new Set(existing.map((row) => row.name));
  const missing = CATALOGUE.filter((item) => !known.has(item.name));

  if (missing.length > 0) await db.insert(items).values(missing);

  console.log(`added ${missing.length} items, ${known.size} already there`);
  process.exit(0);
}

seed();
