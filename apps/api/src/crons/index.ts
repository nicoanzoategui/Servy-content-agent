import cron from 'node-cron';
import { scrapePrices } from './scrape-prices';
import { takeDemandSnapshot } from './demand-snapshot';
import { runCheckinScheduler } from './checkin-scheduler';
import { collectMetrics } from './metrics-collector';
import { runQualityFollowup } from './quality-followup';
import { runRetentionCheck } from './retention-check';
import { runFraudScan } from './fraud-scan';
import { runForecast } from './forecast-generator';
import { runRecruitmentCron } from './recruitment-cycle';
import { runExperimentsDaily, runExperimentsMonthly } from './experiments-cron';
import { processAgentTasks } from '../lib/agent-task-consumer';
import { runDailyFinanceSnapshot } from './finance-snapshot';
import { runWeeklyFinanceReport } from './finance-weekly';
import { runFinanceProjections } from './finance-projections';
import { runMpReconciliation } from './mp-reconciliation';

export function startCrons(): void {
    cron.schedule('0 */6 * * *', () => {
        void scrapePrices().catch((err: unknown) => console.error('[cron scrapePrices]', err));
    });

    cron.schedule('*/5 * * * *', () => {
        void takeDemandSnapshot().catch((err: unknown) => console.error('[cron takeDemandSnapshot]', err));
    });

    cron.schedule('*/5 * * * *', () =>
        void processAgentTasks().catch((err: unknown) =>
            console.error('[agent-tasks] cron error:', err)
        )
    );

    cron.schedule('* * * * *', () => {
        void runCheckinScheduler().catch((err: unknown) => console.error('[cron runCheckinScheduler]', err));
    });

    cron.schedule('0 10 * * *', () => {
        void collectMetrics().catch((err: unknown) => console.error('[cron collectMetrics]', err));
    });

    cron.schedule('0 * * * *', () => {
        void runQualityFollowup().catch((err: unknown) => console.error('[cron runQualityFollowup]', err));
    });

    cron.schedule('0 10 * * *', () => {
        void runRetentionCheck().catch((err: unknown) => console.error('[cron runRetentionCheck]', err));
    });

    cron.schedule('0 3 * * *', () => {
        void runFraudScan().catch((err: unknown) => console.error('[cron runFraudScan]', err));
    });

    cron.schedule('0 8 * * 0', () => {
        void runForecast().catch((err: unknown) => console.error('[cron runForecast]', err));
    });

    cron.schedule('0 6 * * 1', () => {
        void runRecruitmentCron().catch((err: unknown) => console.error('[cron runRecruitmentCron]', err));
    });

    cron.schedule('15 10 * * *', () => {
        void runExperimentsDaily().catch((err: unknown) => console.error('[cron runExperimentsDaily]', err));
    });

    cron.schedule('0 9 1 * *', () => {
        void runExperimentsMonthly().catch((err: unknown) => console.error('[cron runExperimentsMonthly]', err));
    });

    cron.schedule('0 7 * * *', () => {
        void runDailyFinanceSnapshot().catch((err: unknown) => console.error('[cron runDailyFinanceSnapshot]', err));
    });

    cron.schedule('0 8 * * 1', () => {
        void runWeeklyFinanceReport().catch((err: unknown) => console.error('[cron runWeeklyFinanceReport]', err));
    });

    cron.schedule('0 9 1 * *', () => {
        void runFinanceProjections().catch((err: unknown) => console.error('[cron runFinanceProjections]', err));
    });

    cron.schedule('30 7 * * *', () => {
        void runMpReconciliation().catch((err: unknown) => console.error('[cron runMpReconciliation]', err));
    });

    console.log('[CRON agents] Tareas de agentes registradas.');
}
