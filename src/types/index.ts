export type ActiveTab = 'comparison' | 'wizard' | 'code' | 'playground';

export interface ArchitectureOption {
  id: string;
  title: string;
  badge: string;
  recommendedFor: string;
  techStack: string[];
  pros: string[];
  cons: string[];
  structure: string;
  codeSnippet: string;
}

export interface WizardQuestion {
  id: string;
  question: string;
  description: string;
  options: {
    label: string;
    description: string;
    score: Record<string, number>;
  }[];
}

export interface CodeTemplate {
  id: string;
  title: string;
  category: 'client' | 'types' | 'crud' | 'auth' | 'node-backend' | 'rls';
  language: 'typescript' | 'sql';
  description: string;
  code: string;
  typescriptBenefits: string[];
}
