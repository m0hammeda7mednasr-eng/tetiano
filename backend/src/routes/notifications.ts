import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const router = Router();

// Get user notifications
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { unread_only } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unread_only === 'true') {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({ notifications: data });
  } catch (error: any) {
    logger.error('Get notifications error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const { notificationId } = req.params;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', req.user!.id);

    if (error) {
      throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Mark notification read error', { error: error.message });
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', req.user!.id)
      .eq('read', false);

    if (error) {
      throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Mark all read error', { error: error.message });
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Get unread count
router.get('/unread-count', authenticate, async (req: AuthRequest, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user!.id)
      .eq('read', false);

    if (error) {
      throw error;
    }

    res.json({ count: count || 0 });
  } catch (error: any) {
    logger.error('Get unread count error', { error: error.message });
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
