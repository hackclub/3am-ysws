import RewardImage from "./RewardImage";

interface Reward {
  hours: number;
  hoursLabel: string;
  img: string;
  alt: string;
  name: string;
  desc: string;
}

const rewards: Reward[] = [
  {
    hours: 1,
    hoursLabel: "1 hr (stackable)",
    img: "https://www.worthing.in/cdn/shop/products/IMG_20210820_170902.jpg?v=1629459850",
    alt: "Book Grant",
    name: "Book Grant",
    desc: "$5 per hour coded, toward whatever books you're into.",
  },
  {
    hours: 1,
    hoursLabel: "1 hr (stackable)",
    img: "https://cdn.hackclub.com/019fd377-3649-75be-bf89-69efc5540c5c/image.png",
    alt: "Hardware Component Grant",
    name: "Hardware Component Grant",
    desc: "$5 (Stackable) grant to pick up hardware components for your dream project, To build instead of dreaming",
  },
  {
    hours: 1,
    hoursLabel: "1 hr (stackable)",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8YgHI-eO8T_VSS-6tA50IaVhsPWlC6CtM-WS7HRzEkA&s=10",
    alt: "Hosting & Domain Grant",
    name: "Hosting & Domain Grant",
    desc: "$5 toward keeping your project actually live on the internet.",
  },
  {
  hours: 1,
  hoursLabel: "1 hr",
  img: "https://cdn.hackclub.com/019fe60c-0565-778a-838b-8623ec78508c/image.png",
  alt: "Energy Drink Grant",
  name: "Energy Drink Grant",
  desc: "for when you feel sleepy and have no energy",
},
  {
    hours: 1,
    hoursLabel: "1 hr (stackable)",
    img: "https://cdn.hackclub.com/019e22e5-757a-781f-b5e3-a200ed973d98/image.png",
    alt: "Chrome Web Dev Extension",
    name: "Chrome Web Dev Extension",
    desc: "Build cool browser stuff and flex your dev tools skills like an absolute boss.",
  },
  {
    hours: 2,
    hoursLabel: "2 hrs",
    img: "https://cdn.hackclub.com/019fa456-b4dd-7a73-b639-80828e63b63c/image.png",
    alt: "Coffee Gift Card",
    name: "$10 Coffee Card",
    desc: "For the next 3 AM session, whenever it is.",
  },
  {
    hours: 2,
    hoursLabel: "2 hrs (stackable)",
    img: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQanU0gF4QKpnvIgXnmJUeXQaI5NMaWyK6V-1rBVa_j6-A02MkS5HHPunbs1giqx9eRX24aUwAi7LwkTIqwEhmP4kNYda5OAZX-to5HLSdyUmuyT12EAuEldp8",
    alt: "Peripheral Device Grant",
    name: "Peripheral Device Grant",
    desc: "Get a $10 (Stackable) grant. Level up your setup so your fingers and eyes do not completely give up on you at 3am.",
  },
  {
  hours: 2,
  hoursLabel: "2 hrs",
  img: "https://www.foodandwine.com/thmb/YxTpbJjamzotxmM7XzYEq_rloNE=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Here-Are-the-Most-Popular-Snacks-in-America-Per-State-6ada7279c64a46898b6ec09ad083f9f2.jpg",
  alt: "Snacks for the Night",
  name: "Snacks for the Night",
  desc: "Brain food for the night. Stack it and never code on an empty stomach again.",
},
  {
    hours: 2,
    hoursLabel: "2 hrs",
    img: "https://user-cdn.hackclub-assets.com/019fc98d-8ee8-7350-b61e-8d8ac6a72ede/ai.webp",
    alt: "AI & Hosting Credits",
    name: "$10 AI & Hosting Credits (Stackable)",
    desc: "A $10 grant for your favorite AI APIs or hosting services—stack as many as you need.",
  },
  {
  hours: 4,
  hoursLabel: "4 hrs",
  img: "https://cdn.hackclub.com/019fe616-d1bd-7c38-8869-bcf4d63b6e71/image.png",
  alt: "Horror Game Grant",
  name: "Horror Game Grant",
  desc: "For when #3AM ends and you have nothing to do at 3AM",
},
  {
    hours: 4,
    hoursLabel: "4 hrs (stackable)",
    img: "https://i5.walmartimages.com/seo/TOPRenddon-32GB-Portable-MP3-Player-with-LCD-Screen-Ultra-Compact-Metal-Music-Player-USB-Rechargeable-SD-TF-Card-Reader-Audio-Player_fbcbfc6a-3222-41a9-8d8e-fcda8077fdb5.05a535eb8cadf1e8e52c7e97bac9d316.jpeg?odnHeight=573&odnWidth=573&odnBg=FFFFFF",
    alt: "MP3 Player Grant",
    name: "MP3 Player Grant",
    desc: "Get a $20 (Stackable) grant to lock in with your favorite beats without your phone distracting you 24/7.",
  },
  {
  hours: 4,
  hoursLabel: "4 hrs",
  img: "https://cdn.hackclub.com/019fe60b-15b1-705a-9bbc-ee6358328eae/image.png",
  alt: "Brew Machine",
  name: "Brew Machine Grant",
  desc: "Because instant coffee is a crime against humanity and your all-nighters deserve better. Brew your own fuel like the caffeine-dependent legend you are.",
},
  {
    hours: 5,
    hoursLabel: "5 hrs",
    img: "https://cdn.hackclub.com/019fc98d-90a6-7e78-bfff-d55d6b263f27/en_badge_web_generic.png",
    alt: "Google Play Developer Account",
    name: "Google Play Developer Account",
    desc: "A $25 grant to cover the one-time registration fee to publish your apps on the Google Play Store.",
  },
  {
    hours: 6,
    hoursLabel: "6 hrs",
    img: "https://cdn.hackclub.com/019fa458-4a5e-7024-941f-dc038a93780b/image.png",
    alt: "Blue Light Glasses",
    name: "Blue Light Glasses",
    desc: "Your eyes will thank you around hour 4.",
  },
  {
    hours: 8,
    hoursLabel: "8 hrs",
    img: "https://hackyeah.hackclub.com/minecraft.png",
    alt: "Minecraft",
    name: "Minecraft",
    desc: "Because sometimes you want to build without a compiler yelling at you.",
  },
  {
    hours: 10,
    hoursLabel: "10 hrs",
    img: "https://cdn.hackclub.com/019fc991-f6bc-77f7-a2f8-994b155053ac/image.png",
    alt: "E-Reader Grant",
    name: "$50 E-Reader Grant (Stackable)",
    desc: "A $50 grant toward any e-reader of your choice—stack multiple to cover the full cost.",
  },
  {
    hours: 20,
    hoursLabel: "20 hrs",
    img: "https://user-cdn.hackclub-assets.com/019fc991-fb83-76a0-bade-ea4a310811d2/image.png",
    alt: "Logitech MX Master 3S",
    name: "Logitech MX Master 3S",
    desc: "Ergonomic productivity mouse with quiet clicks, electromagnetic scrolling, and an 8K DPI sensor.",
  },
  {
    hours: 20,
    hoursLabel: "20 hrs (stackable)",
    img: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcQSHergPPhI3EYYWRS6FwpbH-wSfz1POogGOgIgTpYIigBAYwfWOkTTAF1PGU7h28FY9hsLWYcXp4aN93A4qt5VnOmFWRRfwX_0uX6Rz-a_Ag6qfa2UUetY7Q",
    alt: "Laptop Grant",
    name: "Laptop Grant",
    desc: "$100 toward a new laptop. Stacks every 20 hours, so keep going.",
  },
  {
  hours: 20,
  hoursLabel: "20 hrs",
  img: "https://media.licdn.com/dms/image/v2/D4D22AQFtGTkok3Eniw/feedshare-shrink_800/feedshare-shrink_800/0/1701798439889?e=1787788800&v=beta&t=2lMisyqKuoQLh-8q9orDyJJVBltM6Vkp_y_ODux5I2E",
  alt: "Telescope",
  name: "Telescope Grant 100$ (Stackable)",
  desc: "That's literally my own telescope in the pic btw :D ",
},
  {
  hours: 26,
  hoursLabel: "26 hrs",
  img: "https://cdn.hackclub.com/019fe615-bd5b-7ea1-853d-2b7ce27dcab8/image.png",
  alt: "Apple Pencil",
  name: "Apple Pencil",
  desc: "Turn your iPad into an actual whiteboard instead of just a very expensive YouTube machine. Sketch your system design diagrams like you're a real engineer and not just cosplaying as one.",
},
  {
    hours: 30,
    hoursLabel: "30 hrs",
    img: "https://hackyeah.hackclub.com/headphones.webp",
    alt: "Sony WH-CH720N",
    name: "Sony WH-CH720N",
    desc: "Noise canceling, for when the house isn't as quiet as 3 AM should be.",
  },
  {
    hours: 31,
    hoursLabel: "31 hrs",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIdPoIO0vVg-60XUh_XWz15aRIMLN1WKbOdAGD2wWGLA&s=10",
    alt: "Standard Edition",
    name: "GTA VI",
    desc: "For everyone who stayed up way past 3 AM to earn this one.",
  },
  {
    hours: 40,
    hoursLabel: "40 hrs",
    img: "https://user-cdn.hackclub-assets.com/019fc98d-8cd3-7f91-b55a-5f20132561e1/image.png",
    alt: "Flipper Zero",
    name: "Flipper Zero",
    desc: "A pocket-sized multi-tool for educational usage for exploring hardware, RFID, NFC, and radio protocols.",
  },
  {
    hours: 60,
    hoursLabel: "60 hrs",
    img: "https://user-cdn.hackclub-assets.com/019fc991-f942-75a1-a5e9-b38dd99fc9d8/lookaside.fbsbx.webp",
    alt: "Meta Smart Glasses",
    name: "Meta Smart Glasses",
    desc: "Capture video, stream music, and build AI projects right from your frame.",
  },
  {
    hours: 65,
    hoursLabel: "65 hrs",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQo9va3cCWu3j-TtW7XKGbor2KuhKfez3-DRzWlcNOZrQ&s=10",
    alt: "iPad 10th Gen",
    name: "iPad (10th Gen)",
    desc: "For sketching, notes, or coding from the couch instead of your desk.",
  },
  {
    hours: 70,
    hoursLabel: "70 hrs",
    img: "https://user-cdn.hackclub-assets.com/019fc98d-9272-7302-8ec7-cc4ff5f5161b/image.png",
    alt: "Meta Quest 3S (128GB)",
    name: "Meta Quest 3S (128GB)",
    desc: "Entry-level mixed reality headset powered by the Snapdragon XR2 Gen 2 chip.",
  },
];

export default function Rewards() {
  return (
    <div className="full-bleed" id="rewards" style={{ background: "var(--bg)" }}>
      <div className="inner">
        <div className="s-tag">
          <svg className="icon">
            <use href="#i-trophy" />
          </svg>{" "}
          Rewards
        </div>
        <h2 className="s-title">Build. Ship. Get rewarded.</h2>
        <p className="s-desc">
          Build something you&apos;d actually want to show people, then grab a reward you&apos;ll
          still be using long after <strong>3 AM</strong> is over.
        </p>

        <div className="rewards-grid" id="rewardsGrid">
          {rewards.map((r, index) => (
            <div className="reward-card" data-hours={r.hours} key={`${r.name}-${index}`}>
              <div className="reward-media">
                <RewardImage src={r.img} alt={r.alt} />
              </div>
              <div className="reward-name">{r.name}</div>
              <div className="reward-desc">{r.desc}</div>
              <span className="reward-hours">{r.hoursLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
