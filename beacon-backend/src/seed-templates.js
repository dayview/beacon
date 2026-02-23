/**
 * Seed script — inserts default Beacon templates into MongoDB.
 * Run: node src/seed-templates.js
 *
 * Safe to re-run: skips templates that already exist (matched by name).
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import Template from './models/Template.js';

const DEFAULT_TEMPLATES = [
    {
        name: 'User Journey Map',
        description: 'Map out the complete user experience from first contact to goal completion. Identify pain points, emotions, and opportunities at every touchpoint.',
        category: 'UX Research',
        color: '#4262ff',
        popular: true,
    },
    {
        name: 'Wireframe Kit',
        description: 'A comprehensive set of low-fidelity UI components for rapid prototyping. Includes common patterns for web and mobile layouts.',
        category: 'Design',
        color: '#ffd02f',
        popular: true,
    },
    {
        name: 'Kanban Board',
        description: 'Visualize your workflow with columns for each stage. Track tasks from backlog to completion with drag-and-drop simplicity.',
        category: 'Business',
        color: '#ef4444',
        popular: false,
    },
    {
        name: 'System Architecture',
        description: 'Document your system design with service diagrams, data flow, and component relationships. Perfect for technical planning.',
        category: 'Development',
        color: '#10b981',
        popular: false,
    },
    {
        name: 'A/B Testing Plan',
        description: 'Structure your A/B tests with hypotheses, test variants, success metrics, and result tracking. Ensure statistically valid experiments.',
        category: 'UX Research',
        color: '#8b5cf6',
        popular: true,
    },
    {
        name: 'Design System',
        description: 'Organize your design tokens, component library, and style guidelines in one place. Keep your team aligned on visual standards.',
        category: 'Design',
        color: '#f59e0b',
        popular: false,
    },
];

async function seed() {
    await connectDB();

    let created = 0;
    let skipped = 0;

    for (const tmpl of DEFAULT_TEMPLATES) {
        const exists = await Template.findOne({ name: tmpl.name });
        if (exists) {
            skipped++;
            continue;
        }
        await Template.create(tmpl);
        created++;
    }

    console.log(`[seed-templates] Done. Created: ${created}, Skipped (already exist): ${skipped}`);
    await mongoose.connection.close();
    process.exit(0);
}

seed().catch((err) => {
    console.error('[seed-templates] Fatal error:', err);
    process.exit(1);
});
