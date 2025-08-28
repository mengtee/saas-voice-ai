import express, { Request, Response } from 'express';
import { ElevenLabsService } from '../services/elevenlabsService';
import { 
  ElevenLabsOutboundRequest, 
  ElevenLabsPhoneNumberRequest, 
  ElevenLabsPersonalizationData 
} from '../types';

const router = express.Router();

const getElevenLabsService = () => new ElevenLabsService();

interface ElevenLabsCallRequest extends Request {
  body: ElevenLabsOutboundRequest;
}

interface PhoneNumberRequest extends Request {
  body: ElevenLabsPhoneNumberRequest;
}

interface PersonalizationRequest extends Request {
  body: {
    caller_number: string;
    agent_id: string;
  };
}

router.post('/make-call', async (req: ElevenLabsCallRequest, res: Response) => {
  try {
    const { phoneNumber, customParameters = {} } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    const result = await getElevenLabsService().initiateOutboundCall(phoneNumber, customParameters);
    
    if (result.success && result.conversationId) {
      console.log(`ElevenLabs outbound call initiated to ${phoneNumber}, ConversationId: ${result.conversationId}`);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error making ElevenLabs call:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/conversation-status/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID is required'
      });
    }
    
    const result = await getElevenLabsService().getConversationStatus(conversationId);
    res.json(result);
  } catch (error) {
    console.error('Error getting conversation status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/add-phone-number', async (req: PhoneNumberRequest, res: Response) => {
  try {
    const { phoneNumber, label } = req.body;
    
    if (!phoneNumber || !label) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and label are required'
      });
    }
    
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!twilioSid || !twilioToken) {
      return res.status(500).json({
        success: false,
        error: 'Twilio credentials are required'
      });
    }
    
    const result = await getElevenLabsService().addPhoneNumber(
      phoneNumber,
      label,
      twilioSid,
      twilioToken
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error adding phone number:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/phone-numbers', async (req: Request, res: Response) => {
  try {
    const result = await getElevenLabsService().listPhoneNumbers();
    res.json(result);
  } catch (error) {
    console.error('Error listing phone numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/webhook/personalization', async (req: PersonalizationRequest, res: Response) => {
  try {
    const { caller_number, agent_id } = req.body;
    
    console.log(`Personalization webhook called for ${caller_number}, agent: ${agent_id}`);
    
    const personalizationData: ElevenLabsPersonalizationData = {
      name: "Valued Customer",
      account_type: "Premium",
      last_interaction: new Date().toISOString(),
      preferences: {
        communication_style: "professional",
        language: "en"
      }
    };
    
    res.json(personalizationData);
  } catch (error) {
    console.error('Error in personalization webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/websocket-url/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID is required'
      });
    }
    
    const result = await getElevenLabsService().createSignedWebSocketUrl(conversationId);
    res.json(result);
  } catch (error) {
    console.error('Error creating WebSocket URL:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;