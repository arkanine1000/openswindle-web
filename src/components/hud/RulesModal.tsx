import { Trans, useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import styles from './RulesModal.module.css';

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

/** A brief, in-fiction rules primer for a stranger to the table. The step
 * strings carry inline <bid>/<i> markup, rendered by <Trans>. */
export function RulesModal({ open, onClose }: RulesModalProps) {
  const { t } = useTranslation();
  const components = { bid: <span className={styles.bid} />, i: <i /> };
  return (
    <Modal open={open} onClose={onClose} title={t('rules.title')} testId="rules-modal">
      <div className={styles.rules}>
        <p className={styles.lede}>{t('rules.lede')}</p>
        <ol className={styles.steps}>
          <li>
            <Trans i18nKey="rules.step1" components={components} />
          </li>
          <li>
            <Trans i18nKey="rules.step2" components={components} />
          </li>
          <li>
            <Trans i18nKey="rules.step3" components={components} />
          </li>
          <li>
            <Trans i18nKey="rules.step4" components={components} />
          </li>
        </ol>
        <p className={styles.aside}>{t('rules.aside')}</p>
      </div>
    </Modal>
  );
}
