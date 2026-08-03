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
    hours: 2,
    hoursLabel: "2 hrs",
    img: "https://cdn.hackclub.com/019fa456-b4dd-7a73-b639-80828e63b63c/image.png",
    alt: "Coffee Gift Card",
    name: "$10 Coffee Card",
    desc: "For the next 3 AM session, whenever it is.",
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
    hours: 15,
    hoursLabel: "15 hrs",
    img: "https://cdn.hackclub.com/019fa458-6eee-713f-8837-ca7c41c3f4ad/image.png",
    alt: "Amazon Kindle",
    name: "Amazon Kindle",
    desc: "For docs, books, or whatever you'd rather read than another Stack Overflow tab.",
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
    hours: 20,
    hoursLabel: "20 hrs (stackable)",
    img: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcQSHergPPhI3EYYWRS6FwpbH-wSfz1POogGOgIgTpYIigBAYwfWOkTTAF1PGU7h28FY9hsLWYcXp4aN93A4qt5VnOmFWRRfwX_0uX6Rz-a_Ag6qfa2UUetY7Q",
    alt: "Laptop Grant",
    name: "Laptop Grant",
    desc: "$100 toward a new laptop. Stacks every 20 hours, so keep going.",
  },
  {
    hours: 1,
    hoursLabel: "1 hr (stackable)",
    img: "https://www.worthing.in/cdn/shop/products/IMG_20210820_170902.jpg?v=1629459850",
    alt: "Book Grant",
    name: "Book Grant",
    desc: "$5 per hour coded, toward whatever books you're into.",
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
    hours: 31,
    hoursLabel: "31 hrs",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIdPoIO0vVg-60XUh_XWz15aRIMLN1WKbOdAGD2wWGLA&s=10",
    alt: "Standard Edition",
    name: "GTA VI",
    desc: "For everyone who stayed up way past 3 AM to earn this one.",
  },
  {
    hours: 1,
    hoursLabel: "1 hr (stackable)",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8YgHI-eO8T_VSS-6tA50IaVhsPWlC6CtM-WS7HRzEkA&s=10",
    alt: "Hosting & Domain Grant",
    name: "Hosting & Domain Grant",
    desc: "$5 toward keeping your project actually live on the internet.",
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
          {rewards.map((r) => (
            <div className="reward-card" data-hours={r.hours} key={r.name}>
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
