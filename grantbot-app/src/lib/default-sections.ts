export type TemplateSection = {
  title: string;
  tokenCount: number;
  defaultContent: (data: {
    organizationName: string;
    opportunityName: string;
  }) => string;
};

export const defaultSections: TemplateSection[] = [
  {
    title: "Needs Statement",
    tokenCount: 480,
    defaultContent: ({ organizationName, opportunityName }) =>
      `${organizationName} is applying to ${opportunityName} to tackle critical community needs. Replace this paragraph with a concise summary of the populations served and the urgency of the problem.`,
  },
  {
    title: "Program Design",
    tokenCount: 630,
    defaultContent: ({ organizationName }) =>
      `Describe how ${organizationName}'s program works, the services provided, and how the approach aligns with funder priorities. Include delivery methods, partnerships, and capacity.`,
  },
  {
    title: "Budget Narrative",
    tokenCount: 310,
    defaultContent: () =>
      "Explain key budget line items, their rationale, and how requested funds will be allocated. Highlight cost per impact and sustainability considerations.",
  },
  {
    title: "Evaluation Plan",
    tokenCount: 290,
    defaultContent: () =>
      "Outline the metrics, data collection methods, and timelines used to assess program success. Mention baseline data, outcome targets, and learning loops.",
  },
  {
    title: "Organizational Capacity",
    tokenCount: 220,
    defaultContent: ({ organizationName }) =>
      `Summarize ${organizationName}'s leadership, track record, and infrastructure. Reference key staff, governance, and previous funding successes.`,
  },
];
