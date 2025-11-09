import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_ROLES = [
  {
    title: 'Senior Salesforce Developer',
    company: 'CloudTech Inc',
    location: 'Remote',
    tags: ['salesforce', 'crm', 'integration', 'cloud'],
    description: 'Build and maintain Salesforce integrations for enterprise clients.',
  },
  {
    title: 'AI/ML Engineer',
    company: 'DeepMind Ventures',
    location: 'San Francisco, CA',
    tags: ['ai', 'mlops', 'python', 'tensorflow'],
    description: 'Develop cutting-edge machine learning models for production systems.',
  },
  {
    title: 'Product Manager - Fintech',
    company: 'PayFlow',
    location: 'New York, NY',
    tags: ['fintech', 'product', 'pm', 'payments'],
    description: 'Lead product strategy for payment processing platform.',
  },
  {
    title: 'Salesforce Architect',
    company: 'Enterprise Solutions Co',
    location: 'Chicago, IL',
    tags: ['salesforce', 'architecture', 'crm', 'enterprise'],
    description: 'Design scalable Salesforce solutions for Fortune 500 companies.',
  },
  {
    title: 'Junior Data Analyst',
    company: 'DataCorp',
    location: 'Remote',
    tags: ['data', 'analytics', 'sql', 'visualization'],
    description: 'Analyze customer data and create actionable insights.',
  },
  {
    title: 'Senior Product Manager',
    company: 'TechGiant',
    location: 'Seattle, WA',
    tags: ['product', 'pm', 'strategy', 'experimentation'],
    description: 'Drive product vision and roadmap for consumer-facing products.',
  },
  {
    title: 'AI Research Scientist',
    company: 'AI Labs',
    location: 'Boston, MA',
    tags: ['ai', 'research', 'genai', 'nlp'],
    description: 'Conduct research in generative AI and natural language processing.',
  },
  {
    title: 'RevOps Specialist',
    company: 'SalesTech Solutions',
    location: 'Austin, TX',
    tags: ['salesforce', 'revops', 'operations', 'analytics'],
    description: 'Optimize revenue operations and sales processes using Salesforce.',
  },
  {
    title: 'Fraud Detection Engineer',
    company: 'SecureBank',
    location: 'Remote',
    tags: ['fintech', 'fraud', 'security', 'ml'],
    description: 'Build ML models to detect and prevent fraudulent transactions.',
  },
  {
    title: 'IC Support Engineer',
    company: 'HelpDesk Pro',
    location: 'Denver, CO',
    tags: ['support', 'customer-success', 'troubleshooting'],
    description: 'Provide technical support to enterprise customers.',
  },
  {
    title: 'Senior AI Product Manager',
    company: 'OpenAI Corp',
    location: 'San Francisco, CA',
    tags: ['ai', 'product', 'pm', 'genai'],
    description: 'Define product strategy for AI-powered applications.',
  },
  {
    title: 'Payment Systems Architect',
    company: 'FinanceFlow',
    location: 'New York, NY',
    tags: ['fintech', 'payments', 'architecture', 'infrastructure'],
    description: 'Design high-throughput payment processing systems.',
  },
  {
    title: 'Salesforce Consultant',
    company: 'Accenture',
    location: 'Multiple Locations',
    tags: ['salesforce', 'consulting', 'implementation', 'crm'],
    description: 'Implement Salesforce solutions across various industries.',
  },
  {
    title: 'MLOps Engineer',
    company: 'DataOps Inc',
    location: 'Remote',
    tags: ['ai', 'mlops', 'devops', 'kubernetes'],
    description: 'Build infrastructure for deploying and monitoring ML models.',
  },
  {
    title: 'Associate Product Manager',
    company: 'StartupX',
    location: 'Remote',
    tags: ['product', 'pm', 'startup', 'analytics'],
    description: 'Support product launches and feature development in fast-paced startup.',
  },
  {
    title: 'Risk Analyst',
    company: 'LendingTree Financial',
    location: 'Charlotte, NC',
    tags: ['fintech', 'risk', 'analytics', 'lending'],
    description: 'Assess credit risk and develop risk models for lending products.',
  },
  {
    title: 'UX Researcher - AI Products',
    company: 'Google',
    location: 'Mountain View, CA',
    tags: ['ux', 'research', 'ai', 'product'],
    description: 'Conduct user research to improve AI product experiences.',
  },
  {
    title: 'Data Engineer - Fintech',
    company: 'Stripe',
    location: 'San Francisco, CA',
    tags: ['data', 'fintech', 'infrastructure', 'analytics'],
    description: 'Build data pipelines for payment analytics and reporting.',
  },
  {
    title: 'Customer Success Manager',
    company: 'Salesforce',
    location: 'Remote',
    tags: ['support', 'customer-success', 'salesforce', 'relationship-management'],
    description: 'Ensure customer success with Salesforce implementation.',
  },
  {
    title: 'Lead Software Engineer - AI',
    company: 'Meta',
    location: 'Menlo Park, CA',
    tags: ['ai', 'engineering', 'leadership', 'architecture'],
    description: 'Lead engineering team building AI-powered social features.',
  },
  {
    title: 'Operations Manager',
    company: 'LogisticsPro',
    location: 'Dallas, TX',
    tags: ['ops', 'operations', 'process-improvement', 'analytics'],
    description: 'Streamline operations and improve efficiency across supply chain.',
  },
  {
    title: 'Senior Salesforce Admin',
    company: 'Enterprise Corp',
    location: 'Remote',
    tags: ['salesforce', 'admin', 'configuration', 'support'],
    description: 'Manage and optimize Salesforce instance for global enterprise.',
  },
  {
    title: 'Generative AI Engineer',
    company: 'Anthropic',
    location: 'San Francisco, CA',
    tags: ['ai', 'genai', 'llm', 'research'],
    description: 'Develop and fine-tune large language models.',
  },
  {
    title: 'Compliance Analyst - Fintech',
    company: 'CryptoBank',
    location: 'New York, NY',
    tags: ['fintech', 'compliance', 'risk', 'regulation'],
    description: 'Ensure regulatory compliance for cryptocurrency platform.',
  },
  {
    title: 'Director of Product',
    company: 'B2B SaaS Inc',
    location: 'Austin, TX',
    tags: ['product', 'pm', 'leadership', 'strategy'],
    description: 'Lead product organization and define long-term product vision.',
  },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.userInsight.deleteMany({});
  await prisma.userSignal.deleteMany({});
  await prisma.userProfile.deleteMany({});
  await prisma.roleFeedback.deleteMany({});
  await prisma.role.deleteMany({});

  // Create sample roles
  console.log('📝 Creating sample roles...');
  for (const roleData of SAMPLE_ROLES) {
    await prisma.role.create({
      data: {
        ...roleData,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      },
    });
  }

  console.log(`✅ Created ${SAMPLE_ROLES.length} sample roles`);

  // Create a sample user profile
  console.log('👤 Creating sample user profile...');
  await prisma.userProfile.create({
    data: {
      userId: 'user-1',
      interests: ['salesforce', 'ai', 'fintech'],
      seniority: 'Senior IC',
      locations: ['Remote', 'San Francisco, CA'],
      companyTypes: ['startup', 'scaleup'],
    },
  });

  console.log('✅ Created sample user profile for user-1');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
