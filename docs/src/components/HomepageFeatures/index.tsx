import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import CollaborationSvg from './CollaborationSvg';
import ViewsSvg from './ViewsSvg';
import PerspectivesSvg from './PerspectivesSvg';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Real-Time Collaboration',
    Svg: CollaborationSvg,
    description: (
      <>
        Work together with your team in real-time. See changes instantly as
        team members add concepts, edit relationships, and update perspectives.
      </>
    ),
  },
  {
    title: 'Visual & Text Views',
    Svg: ViewsSvg,
    description: (
      <>
        Switch between visual graph layouts and structured text views. Choose
        the representation that works best for your workflow.
      </>
    ),
  },
  {
    title: 'Powerful Perspectives',
    Svg: PerspectivesSvg,
    description: (
      <>
        Create filtered views of your concept maps. Focus on specific concepts
        and relationships to explore different aspects of your domain.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
