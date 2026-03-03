import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const router = Router();

// Get user's teams
router.get('/my-teams', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select(
        `
        role,
        teams(*)
      `
      )
      .eq('user_id', req.user!.id);

    if (error) {
      throw error;
    }

    res.json({ teams: data });
  } catch (error: any) {
    logger.error('Get teams error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team members
router.get('/:teamId/members', authenticate, async (req: AuthRequest, res) => {
  try {
    const { teamId } = req.params;

    const { data, error } = await supabase
      .from('team_members')
      .select(
        `
        *,
        user_profiles(full_name, avatar_url)
      `
      )
      .eq('team_id', teamId);

    if (error) {
      throw error;
    }

    res.json({ members: data });
  } catch (error: any) {
    logger.error('Get team members error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Get team brands
router.get('/:teamId/brands', authenticate, async (req: AuthRequest, res) => {
  try {
    const { teamId } = req.params;

    const { data, error } = await supabase
      .from('team_brands')
      .select(
        `
        brands(*)
      `
      )
      .eq('team_id', teamId);

    if (error) {
      throw error;
    }

    res.json({ brands: data?.map((tb: any) => tb.brands) || [] });
  } catch (error: any) {
    logger.error('Get team brands error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch team brands' });
  }
});

export default router;
