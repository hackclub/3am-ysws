export type Reward = {
  name: string;
  cost: number;
  emoji: string;
};

export const BEANS_PER_HOUR = 5;

export const REWARDS: Reward[] = [
  { name: "book grant", cost: 5, emoji: "📚" },
  { name: "hardware grant", cost: 5, emoji: "🔌" },
  { name: "hosting grant", cost: 5, emoji: "☁️" },
  { name: "energy drink grant", cost: 5, emoji: "🥤" },
  { name: "chrome web dev extension", cost: 5, emoji: "🧩" },
];
