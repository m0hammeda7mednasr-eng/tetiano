import cron from 'node-cron';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

function isSchemaCompatibilityError(error: any): boolean {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    text.includes("column") ||
    text.includes("relation") ||
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("unknown relationship")
  );
}

// Daily report reminder job - runs at 18:00 Africa/Cairo
export const dailyReportReminder = async () => {
  try {
    logger.info('Running daily report reminder job');

    const today = new Date().toISOString().split('T')[0];

    const membersResult = await supabase
      .from('store_memberships')
      .select('user_id, store_id, status')
      .eq('status', 'active');

    if (membersResult.error) {
      if (isSchemaCompatibilityError(membersResult.error)) {
        logger.warn('store_memberships table is not ready, skipping daily reminder job');
        return;
      }
      throw membersResult.error;
    }
    const members = (membersResult.data || []) as Array<{ user_id: string; store_id: string; status: string }>;

    if (!members || members.length === 0) {
      logger.info('No active members found');
      return;
    }

    // Get today's reports
    const reportsResult = await supabase
      .from('reports')
      .select('author_user_id')
      .eq('report_date', today);

    let submittedUserIds = new Set<string>();
    if (!reportsResult.error) {
      submittedUserIds = new Set((reportsResult.data || []).map((r: any) => String(r.author_user_id)));
    } else if (!isSchemaCompatibilityError(reportsResult.error)) {
      throw reportsResult.error;
    } else {
      const { data: reports, error: reportsError } = await supabase
      .from('daily_reports')
      .select('user_id')
      .eq('report_date', today);

      if (reportsError) {
        throw reportsError;
      }

      submittedUserIds = new Set(reports?.map((r) => r.user_id) || []);
    }

    // Find users who haven't submitted
    const missingReports = members.filter(
      (member) => !submittedUserIds.has(String(member.user_id))
    );

    logger.info(`Found ${missingReports.length} users without reports`);

    // Create notifications for missing reports
    for (const member of missingReports) {
      let notifResult = await supabase
        .from('notifications')
        .insert({
          user_id: member.user_id,
          store_id: member.store_id,
          type: 'daily_report_reminder',
          title: 'تذكير التقرير اليومي',
          body: `من فضلك ارفع تقرير ${today} اليوم.`,
          is_read: false,
          metadata_json: { report_date: today },
        });

      if (notifResult.error && isSchemaCompatibilityError(notifResult.error)) {
        notifResult = await supabase
          .from('notifications')
          .insert({
            user_id: member.user_id,
            type: 'daily_report_reminder',
            title: 'Daily Report Reminder',
            message: `Please submit your daily report for ${today}.`,
            read: false,
          });
      }

      if (notifResult.error) {
        logger.error('Failed to create notification', {
          userId: member.user_id,
          error: notifResult.error,
        });
      } else {
        logger.info('Notification created', { userId: member.user_id });
      }

      // TODO: Send email notification
      // This would integrate with an email service like SendGrid, AWS SES, etc.
      // await sendEmail({
      //   to: member.email,
      //   subject: 'Daily Report Reminder',
      //   body: `Hi ${member.user_profiles.full_name}, please submit your daily report.`
      // });
    }

    logger.info('Daily report reminder job completed');
  } catch (error: any) {
    logger.error('Daily report reminder job failed', { error: error.message });
  }
};

// Start all scheduled jobs
export const startScheduledJobs = () => {
  // Run daily at 18:00 Africa/Cairo (16:00 UTC in winter, 15:00 UTC in summer)
  // Using 16:00 UTC as a safe default
  cron.schedule('0 16 * * *', dailyReportReminder, {
    timezone: 'Africa/Cairo',
  });

  logger.info('Scheduled jobs started');
  logger.info('Daily report reminder: 18:00 Africa/Cairo');
};
