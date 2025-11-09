export type Plan = {
  id: string;
  name: string;
  price: number;
  maxProposalsPerMonth: number;
  description: string;
};

export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 249,
    maxProposalsPerMonth: 2,
    description: "Up to 2 proposals per quarter, guided drafting",
  },
  {
    id: "growth",
    name: "Growth",
    price: 499,
    maxProposalsPerMonth: 1,
    description: "One new proposal every month plus analytics",
  },
  {
    id: "impact",
    name: "Impact",
    price: 999,
    maxProposalsPerMonth: 5,
    description: "Full-service automation and collaboration",
  },
];
