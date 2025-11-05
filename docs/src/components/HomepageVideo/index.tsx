import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

/**
 * Video section component for the homepage.
 * Embeds educational content about concept mapping.
 * Uses the same YouTube embed implementation as the application sidebar.
 */
export default function HomepageVideo(): ReactNode {
  return (
    <section className={styles.videoSection}>
      <div className="container">
        <div className="row">
          <div className={clsx('col col--8 col--offset--2')}>
            <div className="text--center margin-bottom--lg">
              <Heading as="h2">Learn About Concept Mapping</Heading>
              <p className="text--lg">
                Concept mapping is a powerful technique for visualizing and organizing knowledge.
                Watch this presentation by James Ross to understand how concept maps can help
                make your team&apos;s domain language truly ubiquitous.
              </p>
            </div>
            <div className={styles.videoContainer}>
              <iframe
                className={styles.video}
                src="https://www.youtube.com/embed/0tsUpOmUv88"
                title="Make Your Team's Domain Language Truly Ubiquitous with Concept Maps - James Ross"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="text--center margin-top--md">
              <p className="text--sm">
                <a
                  href="https://www.youtube.com/watch?v=0tsUpOmUv88"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Watch on YouTube →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

