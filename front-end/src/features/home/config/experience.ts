/** One position from Tim's LinkedIn profile. */
export interface ExperienceEntry {
  /** "YYYY-MM" */
  start: string;
  /** "YYYY-MM", or null for the current role ("Present"). */
  end: string | null;
  title: string;
  company: string;
  /** The company's website; null shows the title as plain text, without a link. */
  companyUrl: string | null;
  /** LinkedIn's description (typos fixed); line breaks are kept. */
  description: string;
  /** Technologies named in the description. */
  skills: string[];
}

/**
 * Tim's positions as listed on LinkedIn (his PDF export, pasted on #584). One
 * entry per position, so each keeps its own dates and full description;
 * consecutive positions at one company are grouped when shown.
 */
export const EXPERIENCE: ExperienceEntry[] = [
  {
    start: "2024-10",
    end: null,
    title: "Senior Software Engineer",
    company: "Gemeente Tilburg",
    companyUrl: "https://www.tilburg.nl/",
    description: "Working on migrating the municipality's digital forms software stack from Windows Servers to a docker based deployment with CI/CD integration in Azure DevOps.\nAdditionally, I now administer:\n· Three servers (dev/test/prod)\n· App deployments to iOS App Store & Google Playstore\n· Identity Brokers for user sign in (DigID, eIDAS, AD, EntraID).",
    skills: ["Docker", "Azure DevOps", "CI/CD", "DigiD", "eIDAS", "Entra ID"],
  },
  {
    start: "2023-10",
    end: "2024-09",
    title: "Medior Software Engineer",
    company: "Gemeente Tilburg",
    companyUrl: "https://www.tilburg.nl/",
    description: "Took ownership and made improvements to the backend of the municipality's digital forms on https://www.winkel.tilburg.nl/ that serves as the contact point for all 230.000 citizens.\nAppointed as the new manager and engineer of the Azure DevOps environment. It currently facilitates several scrum boards, git repos, pipelines and application deployment to the Azure Kubernetes Environments (based on Common Ground's haven standards).",
    skills: ["Azure DevOps", "Kubernetes", "Common Ground"],
  },
  {
    start: "2023-05",
    end: "2023-09",
    title: "Medior Software Engineer",
    company: "DebitRoom",
    companyUrl: "https://www.debitroom.com/",
    description: "Appointed as the head of cloud infrastructure, DevOps and micro-services domains.\nWrapped up the cloud platform transition by setting up a deployment pipeline to AWS with automatic code analysis, testing, building and cloud infrastructure generation.\nAfter that, I overhauled the financial data components (customer's cashflows, reports & graphs). Resulting in sub-second API calls (down from 1 to 4 minutes) for the internal finance department and external accountants.\nThe software improvements were built with a micro-service architecture and utilized AWS components (S3, ECS, API Gateway, Cognito & more).",
    skills: ["AWS", "S3", "ECS", "API Gateway", "Cognito", "Microservices"],
  },
  {
    start: "2022-09",
    end: "2023-04",
    title: "Cloud Engineer",
    company: "DebitRoom",
    companyUrl: "https://www.debitroom.com/",
    description: "Co-created the new AWS cloud platform & DevOps environment with another colleague, to be used for various internal and external financial software products.",
    skills: ["AWS", "DevOps"],
  },
  {
    start: "2021-09",
    end: "2022-08",
    title: "Software Engineer",
    company: "DebitRoom",
    companyUrl: "https://www.debitroom.com/",
    description: "Worked on analytical software features to provide corporate customers with financial insight and forecast via a smart platform.",
    skills: [],
  },
  {
    start: "2021-02",
    end: "2021-07",
    title: "Software Engineer",
    company: "Ericsson",
    companyUrl: "https://www.ericsson.com/",
    description: "Developed a realtime video recognition system for cargo container identification & management in distribution facilities.\nI was part of a collection of projects showcasing the possibilities of 5G connectivity (while it was still in its infancy), using an Android app, an OpenCV python backend and a .NET Core REST API.\nAll deployed in a docker environment running on Ubuntu Server, on a local cloud edge server.",
    skills: ["5G", "Android", "OpenCV", "Python", ".NET Core", "Docker", "Ubuntu Server"],
  },
  {
    start: "2019-09",
    end: "2020-02",
    title: "Software Engineer",
    company: "Achmea",
    companyUrl: "https://www.achmea.nl/",
    description: "Implementation and deployment of an internal IT monitoring system.",
    skills: [],
  },
];
