import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Sidebar configuration for the Concept Mapping Tool documentation.
 * 
 * Organized into three main sections:
 * - User Guide: End-user documentation
 * - Components: React component API documentation
 * - Architecture: System design and technical architecture
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
        'user-guide/perspectives',
        'user-guide/collaboration',
        'user-guide/sharing',
      ],
    },
    {
      type: 'category',
      label: 'Components',
      items: [
        'components/intro',
        {
          type: 'category',
          label: 'Core Components',
          items: [
            'components/concept-node',
            'components/concept-editor',
            'components/relationship-edge',
            'components/relationship-editor',
            'components/concept-map-canvas',
            'components/unified-editor',
          ],
        },
        {
          type: 'category',
          label: 'Layout Components',
          items: [
            'components/app-layout',
            'components/sidebar',
            'components/search-box',
          ],
        },
        {
          type: 'category',
          label: 'Presence Components',
          items: [
            'components/presence-avatar',
            'components/presence-cursor',
            'components/editing-highlight',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/data-model',
        'architecture/state-management',
        'architecture/instantdb-integration',
        'architecture/realtime-sync',
        'architecture/layout-algorithms',
        'architecture/performance',
      ],
    },
  ],
};

export default sidebars;
