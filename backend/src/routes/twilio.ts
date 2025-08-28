import express, { Request, Response } from 'express';
import { TwilioService } from '../services/twilioService';
import { ElevenLabsService } from '../services/elevenlabsService';
import { TwilioCallRequest } from '../types';

const router = express.Router();

const getTwilioService = () => new TwilioService();

interface InboundCallRequest extends Request {
  body: TwilioCallRequest;
}

interface OutboundCallRequest extends Request {
  body: {
    to: string;
    customParameters?: Record<string, any>;
  };
}

router.post('/webhook/inbound', async (req: InboundCallRequest, res: Response) => {
  try {
    const { From, To, CallSid } = req.body;
    
    console.log(`Inbound call from ${From} to ${To}, CallSid: ${CallSid}`);
    
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error('BASE_URL environment variable is required');
    }
    
    const twimlResponse = getTwilioService().generateTwiMLResponse(
      'Thank you for calling. Please hold while we connect you to our AI assistant.',
      {
        type: 'redirect',
        url: `${baseUrl}/api/twilio/connect-elevenlabs`
      }
    );
    
    res.type('text/xml');
    res.send(twimlResponse);
  } catch (error) {
    console.error('Error handling inbound call:', error);
    
    const errorResponse = getTwilioService().generateTwiMLResponse(
      'Sorry, we are experiencing technical difficulties. Please try again later.'
    );
    
    res.type('text/xml');
    res.send(errorResponse);
  }
});

router.post('/connect-elevenlabs', async (req: InboundCallRequest, res: Response) => {
  try {
    const { From } = req.body;
    
    const elevenlabsPhoneNumber = process.env.ELEVENLABS_PHONE_NUMBER || From;
    
    const twimlResponse = getTwilioService().generateTwiMLResponse(
      'Connecting you now...',
      {
        type: 'dial',
        number: elevenlabsPhoneNumber
      }
    );
    
    res.type('text/xml');
    res.send(twimlResponse);
  } catch (error) {
    console.error('Error connecting to ElevenLabs:', error);
    
    const errorResponse = getTwilioService().generateTwiMLResponse(
      'Unable to connect to our assistant. Please try again.'
    );
    
    res.type('text/xml');
    res.send(errorResponse);
  }
});

router.post('/make-call', async (req: OutboundCallRequest, res: Response) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      return res.status(500).json({
        success: false,
        error: 'BASE_URL environment variable is required'
      });
    }
    
    const webhookUrl = `${baseUrl}/api/twilio/webhook/outbound`;
    
    const result = await getTwilioService().makeOutboundCall(to, webhookUrl);
    
    if (result.success && result.callSid) {
      console.log(`Outbound call initiated to ${to}, CallSid: ${result.callSid}`);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error making outbound call:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/webhook/outbound', async (req: InboundCallRequest, res: Response) => {
  try {
    const { To, CallSid } = req.body;
    
    console.log(`Outbound call connected to ${To}, CallSid: ${CallSid}`);
    
    // Option 1: Forward to ElevenLabs phone number (if available)
    const elevenlabsPhoneNumber = process.env.ELEVENLABS_PHONE_NUMBER;
    
    if (elevenlabsPhoneNumber) {
      const twimlResponse = getTwilioService().generateTwiMLResponse(
        'Connecting you to our AI assistant...',
        {
          type: 'dial',
          number: elevenlabsPhoneNumber
        }
      );
      
      res.type('text/xml');
      res.send(twimlResponse);
    } else {
      // Option 2: Play message and suggest using ElevenLabs direct call
      const twimlResponse = getTwilioService().generateTwiMLResponse(
        'Hello! This is an AI-powered call. For full conversational AI, please use the ElevenLabs direct calling feature.'
      );
      
      res.type('text/xml');
      res.send(twimlResponse);
    }
  } catch (error) {
    console.error('Error handling outbound call:', error);
    
    const errorResponse = getTwilioService().generateTwiMLResponse(
      'Sorry, there was an issue with this call.'
    );
    
    res.type('text/xml');
    res.send(errorResponse);
  }
});

router.get('/call-status/:callSid', async (req: Request, res: Response) => {
  try {
    const { callSid } = req.params;
    if (!callSid) {
      return res.status(400).json({
        success: false,
        error: 'Call SID is required'
      });
    }
    
    const result = await getTwilioService().getCallStatus(callSid);
    res.json(result);
  } catch (error) {
    console.error('Error getting call status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;