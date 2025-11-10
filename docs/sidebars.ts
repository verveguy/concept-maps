import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import { apiSidebarItems } from './sidebars.api';

/**
 * Sidebar configuration for the Concept Mapping Tool documentation.
 * 
 * Organized into two main sections:
 * - User Guide: End-user documentation
 * - Developing: Developer documentation, guides, components, and architecture
 * 
 * Note: API Reference sidebar items are auto-generated from TypeDoc output.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'user-guide/intro',
        'user-guide/getting-started',
        'user-guide/creating-maps',
        'user-guide/editing-concepts',
        'user-guide/relationships',
        'user-guide/comments',
        'user-guide/perspectives',
        'user-guide/collaboration',
        'user-guide/sharing',
      ],
    },
    {
      type: 'category',
      label: 'Developing',
      items: [
        'developing/intro',
        {
          type: 'category',
          label: 'Components',
          items: [
            'developing/components/intro',
            {
              type: 'category',
              label: 'Core Components',
              items: [
                'developing/components/concept-node',
                'developing/components/concept-editor',
                'developing/components/relationship-edge',
                'developing/components/relationship-editor',
                'developing/components/concept-map-canvas',
                'developing/components/unified-editor',
              ],
            },
            {
              type: 'category',
              label: 'Layout Components',
              items: [
                'developing/components/app-layout',
                'developing/components/sidebar',
                'developing/components/search-box',
              ],
            },
            {
              type: 'category',
              label: 'Presence Components',
              items: [
                'developing/components/presence-avatar',
                'developing/components/presence-cursor',
                'developing/components/editing-highlight',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Architecture',
          items: [
            'developing/architecture/overview',
            'developing/architecture/data-model',
            'developing/architecture/state-management',
            'developing/architecture/instantdb-integration',
            'developing/architecture/realtime-sync',
            'developing/architecture/layout-algorithms',
            'developing/architecture/performance',
          ],
        },
        {
          type: 'category',
          label: 'API Reference',
          collapsed: true,
          items: apiSidebarItems,
        },
        {
          type: 'category',
          label: 'Setup & Configuration',
          items: [
            'developing/setup/building',
            'developing/setup/docusaurus',
            'developing/setup/instantdb',
          ],
        },
        'developing/contributing',
        {
          type: 'category',
          label: 'Development Guides',
          items: [
            'developing/guides/react-flow-optimization',
            'developing/guides/sharing-system-review',
          ],
        },
        {
          type: 'category',
          label: 'Planning Documents',
          items: [
            'developing/planning/implementation-plan',
            'developing/planning/command-pattern',
            'developing/planning/perspective-edit',
            'developing/planning/concept-map-comparison',
            'developing/planning/questions',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
