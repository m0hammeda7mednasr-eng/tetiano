import { Router } from 'express';
import { authenticate, requirePermission, AuthRequest } from "../middleware/auth";
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const router = Router();

function isSchemaCompatibilityError(error: any): boolean {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (
    text.includes('column') ||
    text.includes('relation') ||
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('unknown relationship')
  );
}

async function canAccessTeam(userId: string, teamId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) {
    if (isSchemaCompatibilityError(error)) {
      return false;
    }
    throw error;
  }

  return Boolean(data?.id);
}

// Get user's daily reports
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { start_date, end_date, team_id } = req.query;
    const requestedTeamId = team_id ? String(team_id) : '';

    let query = supabase
      .from('daily_reports')
      .select(
        `
        *,
        user_profiles(full_name)
      `
      )
      .order('report_date', { ascending: false });

    if (requestedTeamId) {
      if (req.user?.role !== 'admin') {
        const allowed = await canAccessTeam(req.user!.id, requestedTeamId);
        if (!allowed) {
          return res.status(403).json({ error: 'Access denied for requested team' });
        }
      }
      query = query.eq('team_id', requestedTeamId);
    } else {
      query = query.eq('user_id', req.user!.id);
    }

    if (start_date) {
      query = query.gte('report_date', start_date);
    }

    if (end_date) {
      query = query.lte('report_date', end_date);
    }

    let { data, error } = await query;

    if (error && requestedTeamId && isSchemaCompatibilityError(error)) {
      return res.status(503).json({
        error: 'Team-based reports are unavailable until team_id migration is applied.',
      });
    }

    if (error && isSchemaCompatibilityError(error)) {
      const fallback = await supabase
        .from('daily_reports')
        .select(
          `
          *,
          user_profiles(full_name)
        `
        )
        .eq('user_id', req.user!.id)
        .order('report_date', { ascending: false });

      data = fallback.data;
      error = fallback.error;
    }

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

    // Get user's team (if schema still uses team-based reports)
    const teamMemberResult = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (teamMemberResult.error && !isSchemaCompatibilityError(teamMemberResult.error)) {
      throw teamMemberResult.error;
    }

    const reportDate = report_date || new Date().toISOString().split('T')[0];
    const reportPayload: Record<string, unknown> = {
      user_id: req.user!.id,
      report_date: reportDate,
      done_today,
      blockers: blockers || null,
      plan_tomorrow,
    };

    const teamId = teamMemberResult.data?.team_id;
    if (teamId) {
      reportPayload.team_id = teamId;
    }

    let { data, error } = await supabase
      .from('daily_reports')
      .upsert(reportPayload, { onConflict: 'user_id,report_date' })
      .select()
      .single();

    if (error && isSchemaCompatibilityError(error)) {
      const fallbackPayload = { ...reportPayload };
      delete fallbackPayload.team_id;

      const fallback = await supabase
        .from('daily_reports')
        .upsert(fallbackPayload, { onConflict: 'user_id,report_date' })
        .select()
        .single();

      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

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

    if (req.user?.role !== 'admin') {
      const allowed = await canAccessTeam(req.user!.id, teamId);
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied for requested team' });
      }
    }

    // Get all team members
    const membersResult = await supabase
      .from('team_members')
      .select(
        `
        user_id,
        user_profiles(full_name)
      `
      )
      .eq('team_id', teamId);

    if (membersResult.error) {
      throw membersResult.error;
    }
    const members = membersResult.data || [];

    // Get reports for the date
    const reportsResult = await supabase
      .from('daily_reports')
      .select('*')
      .eq('team_id', teamId)
      .eq('report_date', reportDate);

    if (reportsResult.error) {
      if (isSchemaCompatibilityError(reportsResult.error)) {
        return res.status(503).json({
          error: 'Team summary is unavailable until team_id migration is applied.',
        });
      }
      throw reportsResult.error;
    }

    const reports = reportsResult.data || [];

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
