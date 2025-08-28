import axios, { AxiosError } from 'axios';
import { 
  ElevenLabsCallResponse, 
  ElevenLabsConversationStatus, 
  ElevenLabsWebSocketResponse, 
  ElevenLabsPhoneNumberResponse 
} from '../types';

export class ElevenLabsService {
  private apiKey: string;
  private agentId: string;
  private baseUrl: string = 'https://api.elevenlabs.io/v1';

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;

    if (!apiKey || !agentId) {
      throw new Error('ElevenLabs API key and Agent ID are required');
    }

    this.apiKey = apiKey;
    this.agentId = agentId;
  }

  async initiateOutboundCall(
    phoneNumber: string, 
    customParameters: Record<string, any> = {}
  ): Promise<ElevenLabsCallResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/convai/twilio/outbound-call`,
        {
          agent_id: this.agentId,
          to_number: phoneNumber,
          agent_phone_number_id: customParameters.agent_phone_number_id || 'default',
          conversation_initiation_client_data: customParameters
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        conversationId: response.data.conversation_id,
        status: response.data.status
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error initiating ElevenLabs outbound call:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: (axiosError.response?.data as any)?.detail || axiosError.message || 'Unknown error'
      };
    }
  }

  async getConversationStatus(conversationId: string): Promise<ElevenLabsConversationStatus> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/conversations/${conversationId}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return {
        success: true,
        status: response.data.status,
        duration: response.data.duration_seconds,
        transcript: response.data.transcript
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error getting conversation status:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: (axiosError.response?.data as any)?.detail || axiosError.message || 'Unknown error'
      };
    }
  }

  async createSignedWebSocketUrl(conversationId: string): Promise<ElevenLabsWebSocketResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/conversations/${conversationId}/token`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return {
        success: true,
        wsUrl: response.data.ws_url,
        token: response.data.token
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error creating WebSocket URL:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: (axiosError.response?.data as any)?.detail || axiosError.message || 'Unknown error'
      };
    }
  }

  async addPhoneNumber(
    phoneNumber: string, 
    label: string, 
    twilioSid: string, 
    twilioToken: string
  ): Promise<ElevenLabsPhoneNumberResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/convai/phone-numbers`,
        {
          phone_number: phoneNumber,
          label: label,
          agent_id: this.agentId,
          twilio_account_sid: twilioSid,
          twilio_auth_token: twilioToken
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        phoneNumberId: response.data.phone_number_id,
        status: response.data.status
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error adding phone number:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: (axiosError.response?.data as any)?.detail || axiosError.message || 'Unknown error'
      };
    }
  }

  async listPhoneNumbers(): Promise<{ success: boolean; phoneNumbers?: any[]; error?: string }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/phone-numbers`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return {
        success: true,
        phoneNumbers: response.data.phone_numbers
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error listing phone numbers:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: (axiosError.response?.data as any)?.detail || axiosError.message || 'Unknown error'
      };
    }
  }
}