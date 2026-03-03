import { Router } from 'express';
import { authenticate, requirePermission, AuthRequest } from "../middleware/auth";
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const router = Router();

// Get user's daily reports
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { start_date, end_date, team_id } = req.query;

    let query = supabase
      .from('daily_reports')
      .select(
        `
        *,
        user_profiles(full_name)
      `
      )
      .order('report_date', { ascending: false });

    if (team_id) {
      query = query.eq('team_id', team_id);
    } else {
      query = query.eq('user_id', req.user!.id);
    }

    if (start_date) {
      query = query.gte('report_date', start_date);
    }

    if (end_date) {
      query = query.lte('report_date', end_date);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({ reports: data });
  } catch (error: any) {
    logger.error('Get reports error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Submit daily report
router.post("/", authenticate, requirePermission("can_submit_reports"), async (req: AuthRequest, res) => {
  try {
    const { done_today, blockers, plan_tomorrow, report_date } = req.body;

    if (!done_today || !plan_tomorrow) {
      return res.status(400).json({
        error: 'done_today and plan_tomorrow are required',
      });
    }

    // Get user's team
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', req.user!.id)
      .single();

    if (!teamMember) {
      return res.status(400).json({ error: 'User not assigned to a team' });
    }

    const reportDate = report_date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_reports')
      .upsert(
        {
          user_id: req.user!.id,
          team_id: teamMember.team_id,
          report_date: reportDate,
          done_today,
          blockers: blockers || null,
          plan_tomorrow,
        },
        { onConflict: 'user_id,report_date' }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ report: data, message: 'Report submitted successfully' });
  } catch (error: any) {
    logger.error('Submit report error', { error: error.message });
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Check if user submitted today's report
router.get("/status/today", authenticate, requirePermission("can_submit_reports"), async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_reports')
      .select('id, submitted_at')
      .eq('user_id', req.user!.id)
      .eq('report_date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      submitted: !!data,
      report: data || null,
    });
  } catch (error: any) {
    logger.error('Check report status error', { error: error.message });
    res.status(500).json({ error: 'Failed to check report status' });
  }
});

// Get team report summary
router.get("/team/:teamId/summary", authenticate, requirePermission("can_view_reports"), async (req: AuthRequest, res) => {
  try {
    const { teamId } = req.params;
    const { date } = req.query;
    const reportDate = (date as string) || new Date().toISOString().split('T')[0];

    // Get all team members
    const { data: members } = await supabase
      .from('team_members')
      .select(
        `
        user_id,
        user_profiles(full_name)
      `
      )
      .eq('team_id', teamId);

    // Get reports for the date
    const { data: reports } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('team_id', teamId)
      .eq('report_date', reportDate);

    const submittedUserIds = new Set(reports?.map((r) => r.user_id) || []);

    const summary = {
      date: reportDate,
      total_members: members?.length || 0,
      submitted: reports?.length || 0,
      missing: (members?.length || 0) - (reports?.length || 0),
      members: members?.map((m) => ({
        user_id: m.user_id,
        full_name: (m.user_profiles as any)?.full_name,
        submitted: submittedUserIds.has(m.user_id),
      })),
    };

    res.json(summary);
  } catch (error: any) {
    logger.error('Get team summary error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch team summary' });
  }
});

export default router;
