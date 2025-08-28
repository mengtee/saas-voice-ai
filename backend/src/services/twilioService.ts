import twilio from 'twilio';
import { TwilioCallResponse, TwilioCallStatus, TwiMLAction } from '../types';

export class TwilioService {
  private client: twilio.Twilio;

  constructor() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials are required');
    }
    
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async makeOutboundCall(to: string, webhookUrl: string): Promise<TwilioCallResponse> {
    try {
      if (!process.env.TWILIO_PHONE_NUMBER) {
        throw new Error('Twilio phone number is required');
      }

      const call = await this.client.calls.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
        url: webhookUrl,
        method: 'POST'
      });
      
      return {
        success: true,
        callSid: call.sid,
        status: call.status
      };
    } catch (error) {
      console.error('Error making outbound call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getCallStatus(callSid: string): Promise<TwilioCallStatus> {
    try {
      const call = await this.client.calls(callSid).fetch();
      return {
        success: true,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime?.toISOString(),
        endTime: call.endTime?.toISOString()
      };
    } catch (error) {
      console.error('Error fetching call status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  generateTwiMLResponse(message?: string, action?: TwiMLAction): string {
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (message) {
      twiml.say(message);
    }
    
    if (action) {
      switch (action.type) {
        case 'dial':
          if (action.number) {
            const dial = twiml.dial();
            dial.number(action.number);
          }
          break;
        case 'gather':
          const gather = twiml.gather({
            input: ['speech', 'dtmf'],
            timeout: action.timeout || 5,
            action: action.url
          });
          if (action.prompt) {
            gather.say(action.prompt);
          }
          break;
        case 'redirect':
          if (action.url) {
            twiml.redirect(action.url);
          }
          break;
      }
    }
    
    return twiml.toString();
  }
}