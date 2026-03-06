import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
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

async function hasTeamAccess(userId: string, teamId: string): Promise<boolean> {
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
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      const allowed = await hasTeamAccess(req.user!.id, teamId);
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied for this team' });
      }
    }

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
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      const allowed = await hasTeamAccess(req.user!.id, teamId);
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied for this team' });
      }
    }

    const { data, error } = await supabase
      .from('team_brands')
      .select(
        `
        brands(*)
      `
      )
      .eq('team_id', teamId);

    if (error) {
      if (isSchemaCompatibilityError(error)) {
        return res.json({ brands: [] });
      }
      throw error;
    }

    res.json({ brands: data?.map((tb: any) => tb.brands) || [] });
  } catch (error: any) {
    logger.error('Get team brands error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch team brands' });
  }
});

export default router;
