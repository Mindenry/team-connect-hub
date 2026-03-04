const fs = require('fs');
const path = require('path');

const dbmlPath = '/Users/mind/Documents/GitHub/team-connect/tmp-dbml/dbml/schema.dbml';
const promptOutputPath = '/Users/mind/Documents/GitHub/team-connect/team-connect-hub/prompt.txt';

const schemaContent = fs.readFileSync(dbmlPath, 'utf8');

const promptText = `I am building a React/TypeScript application and need a comprehensive Figma design for "Team Connect", an enterprise-grade collaboration and productivity workspace.

Based on the highly detailed database schema below, please generate a full UI/UX design system and mockups for the key pages. The application should have a premium, modern, and highly polished aesthetic following best practices in design (clean layouts, consistent spacing, excellent typography, accessible contrast, and professional color palettes).

Please include the following core views:
1. Dashboard / Home - A high-level overview of active assigned Tasks, upcoming Meetings, recent Messages, and Activity Streams.
2. Agile Project Management - A detailed view for Sprints, Epics, Tasks (Kanban board or list view), and Task details.
3. Communication Hub - Channels and Direct Messages view representing Slack-like chat interactions and threads.
4. Meeting Room / Video Call - A video conferencing UI displaying participants, screen sharing, chat, and meeting controls.
5. Directory & Admin Console - User list, Role assignments, Organization settings, and Team structures.
6. Wiki & Documents - A knowledge base layout for Wiki Articles, Document Folders, and Document Versions.

Database Schema (DBML):
\`\`\`dbml
${schemaContent}
\`\`\`

Generate a cohesive and extensive set of designs that clearly map to these tables, prioritizing user experience and functional density typical of complex SaaS applications. Make it look fully complete and ready for development.
`;

fs.writeFileSync(promptOutputPath, promptText);
console.log('AI Prompt generated successfully at ' + promptOutputPath);
