import cron from 'node-cron';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// Daily report reminder job - runs at 18:00 Africa/Cairo
export const dailyReportReminder = async () => {
  try {
    logger.info('Running daily report reminder job');

    const today = new Date().toISOString().split('T')[0];

    // Get all active team members
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(
        `
        user_id,
        team_id,
        user_profiles(full_name)
      `
      );

    if (membersError) {
      throw membersError;
    }

    if (!members || members.length === 0) {
      logger.info('No team members found');
      return;
    }

    // Get today's reports
    const { data: reports, error: reportsError } = await supabase
      .from('daily_reports')
      .select('user_id')
      .eq('report_date', today);

    if (reportsError) {
      throw reportsError;
    }

    const submittedUserIds = new Set(reports?.map((r) => r.user_id) || []);

    // Find users who haven't submitted
    const missingReports = members.filter(
      (member) => !submittedUserIds.has(member.user_id)
    );

    logger.info(`Found ${missingReports.length} users without reports`);

    // Create notifications for missing reports
    for (const member of missingReports) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: member.user_id,
          type: 'daily_report_reminder',
          title: 'Daily Report Reminder',
          message: `Please submit your daily report for ${today}. What did you accomplish today?`,
          read: false,
        });

      if (notifError) {
        logger.error('Failed to create notification', {
          userId: member.user_id,
          error: notifError,
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
