import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { Config } from '../config';
import { ElevenLabsService } from '../services/elevenlabsService';
import { createAuthMiddleware } from '../middleware/auth';

export const createRecordingsRoutes = (pool: Pool, config: Config) => {
  const router = express.Router();
  const elevenLabsService = new ElevenLabsService();
  const authenticateToken = createAuthMiddleware(pool, config);

  /**
   * GET /api/recordings/conversations
   * 
   * Get all conversation recordings from ElevenLabs
   * Returns list of conversations with basic info
   */
  router.get('/conversations', authenticateToken, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await elevenLabsService.getAllConversations(limit);
      
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch conversations'
        });
      }

      // Transform ElevenLabs data to match frontend interface
      // Note: List conversations endpoint only returns summary data, not detailed lead info
      const recordings = result.conversations?.map((conv: any) => ({
        id: conv.conversation_id,
        callId: conv.conversation_id,
        leadName: conv.call_summary_title || `Call ${conv.conversation_id.slice(-8)}`, // Use summary title or fallback
        phoneNumber: 'Not available', // Not provided in list endpoint
        duration: conv.call_duration_secs || 0,
        recordingUrl: conv.conversation_id ? `/api/recordings/${conv.conversation_id}/audio` : null,
        startTime: conv.start_time_unix_secs ? new Date(conv.start_time_unix_secs * 1000).toISOString() : new Date().toISOString(),
        endTime: conv.start_time_unix_secs && conv.call_duration_secs ? 
          new Date((conv.start_time_unix_secs + conv.call_duration_secs) * 1000).toISOString() : 
          new Date().toISOString(),
        outcome: conv.call_successful === 'success' ? 'successful' : 
                conv.call_successful === 'failed' ? 'failed' : 'unknown',
        agentId: conv.agent_id,
        transcript: [], // Will be loaded separately
        status: conv.status,
        direction: conv.direction,
        messageCount: conv.message_count
      })) || [];

      res.json({
        success: true,
        data: recordings,
        message: 'Conversations retrieved successfully'
      });

    } catch (error: any) {
      console.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversations'
      });
    }
  });

  /**
   * GET /api/recordings/:conversationId/details
   * 
   * Get detailed conversation info including transcript
   */
  router.get('/:conversationId/details', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      
      const result = await elevenLabsService.getConversationDetails(conversationId);
      
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch conversation details'
        });
      }

      const conversation = result.conversation;
      
      // Transform transcript data based on actual ElevenLabs format
      const transcript = conversation.transcript?.map((item: any, index: number) => ({
        id: `seg_${index}`,
        speaker: item.role === 'agent' ? 'agent' : 'customer', // Use 'role' field
        text: item.message || item.text || '', // Use 'message' field
        startTime: item.time_in_call_secs || 0, // Use correct field name
        endTime: item.time_in_call_secs || 0, // ElevenLabs doesn't provide end time
        confidence: 0.95, // Default confidence since not provided
        sentiment: 'neutral' // Default sentiment since not provided
      })) || [];

      // Only return transcript - frontend keeps everything else unchanged
      const recordingData = {
        transcript
      };

      res.json({
        success: true,
        data: recordingData,
        message: 'Conversation details retrieved successfully'
      });

    } catch (error: any) {
      console.error('Get conversation details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversation details'
      });
    }
  });

  /**
   * GET /api/recordings/:conversationId/audio
   * 
   * Get audio recording file as base64 data URL
   */
  router.get('/:conversationId/audio', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      
      const result = await elevenLabsService.getConversationAudio(conversationId);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch audio recording'
        });
      }

      res.json({
        success: true,
        data: {
          audioUrl: result.audioUrl
        },
        message: 'Audio recording retrieved successfully'
      });

    } catch (error: any) {
      console.error('Get audio recording error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audio recording'
      });
    }
  });

  /**
   * GET /api/recordings/campaign/:campaignId
   * 
   * Get recordings for a specific campaign
   * Filters conversations by campaign_id in client data
   */
  router.get('/campaign/:campaignId', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      
      // Get all conversations and filter by campaign ID
      const result = await elevenLabsService.getAllConversations(100);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch campaign recordings'
        });
      }

      // Filter conversations by campaign ID
      const campaignConversations = result.conversations?.filter((conv: any) => 
        conv.conversation_initiation_client_data?.campaign_id === campaignId
      ) || [];

      const recordings = campaignConversations.map((conv: any) => ({
        id: conv.conversation_id,
        callId: conv.conversation_id,
        leadName: conv.conversation_initiation_client_data?.dynamic_variables?.name || 'Unknown',
        phoneNumber: conv.conversation_initiation_client_data?.dynamic_variables?.phone_number || 'Unknown',
        duration: conv.duration_seconds || 0,
        recordingUrl: `/api/recordings/${conv.conversation_id}/audio`,
        startTime: conv.created_at || new Date().toISOString(),
        endTime: conv.end_timestamp || new Date().toISOString(),
        outcome: conv.analysis?.outcome || 'unknown',
        agentId: conv.agent_id
      }));

      res.json({
        success: true,
        data: recordings,
        message: 'Campaign recordings retrieved successfully'
      });

    } catch (error: any) {
      console.error('Get campaign recordings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch campaign recordings'
      });
    }
  });

  /**
   * GET /api/recordings/conversations/paginated
   * 
   * Get paginated conversation recordings with advanced filtering
   * Supports cursor-based pagination and date filtering
   */
  router.get('/conversations/paginated', authenticateToken, async (req: Request, res: Response) => {
    try {
      const pageSize = parseInt(req.query.page_size as string) || 30;
      const cursor = req.query.cursor as string;
      const callStartAfter = req.query.call_start_after ? parseInt(req.query.call_start_after as string) : undefined;
      const callStartBefore = req.query.call_start_before ? parseInt(req.query.call_start_before as string) : undefined;
      const callSuccessful = req.query.call_successful === 'true' ? true : req.query.call_successful === 'false' ? false : undefined;
      const userId = req.query.user_id as string;
      
      const result = await elevenLabsService.getAllConversations(
        pageSize,
        cursor,
        {
          callStartAfter,
          callStartBefore,
          callSuccessful,
          userId
        }
      );
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch conversations'
        });
      }

      // Transform ElevenLabs data to match frontend interface  
      // Note: List conversations endpoint only returns summary data, not detailed lead info
      const recordings = result.conversations?.map((conv: any) => ({
        id: conv.conversation_id,
        callId: conv.conversation_id,
        leadName: conv.call_summary_title || `Call ${conv.conversation_id.slice(-8)}`, // Use summary title or fallback
        phoneNumber: 'Not available', // Not provided in list endpoint
        duration: conv.call_duration_secs || 0,
        recordingUrl: conv.conversation_id ? `/api/recordings/${conv.conversation_id}/audio` : null,
        startTime: conv.start_time_unix_secs ? new Date(conv.start_time_unix_secs * 1000).toISOString() : new Date().toISOString(),
        endTime: conv.start_time_unix_secs && conv.call_duration_secs ? 
          new Date((conv.start_time_unix_secs + conv.call_duration_secs) * 1000).toISOString() : 
          new Date().toISOString(),
        outcome: conv.call_successful === 'success' ? 'successful' : 
                conv.call_successful === 'failed' ? 'failed' : 'unknown',
        agentId: conv.agent_id,
        transcript: [], // Will be loaded separately
        status: conv.status,
        direction: conv.direction,
        messageCount: conv.message_count
      })) || [];

      res.json({
        success: true,
        data: recordings,
        pagination: {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore
        },
        message: 'Conversations retrieved successfully'
      });

    } catch (error: any) {
      console.error('Get paginated conversations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversations'
      });
    }
  });

  return router;
};