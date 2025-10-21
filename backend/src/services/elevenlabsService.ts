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

  /**
   * Create a batch calling campaign using ElevenLabs Batch Calling API
   * https://elevenlabs.io/docs/api-reference/batch-calling/create
   */
  async createBatchCalling(
    phoneNumbers: string[],
    customData: Record<string, any> = {}
  ): Promise<{ success: boolean; batchId?: string; error?: string }> {
    let requestBody: any;
    
    try {
      // Convert phone numbers to recipients format with minimal dynamic variables
      const recipients = phoneNumbers.map((phoneNumber, index) => {
        const recipient: any = {
          phone_number: phoneNumber
        };
        
        // Always add phone_number as dynamic variable and other lead data if available
        const dynamicVariables: Record<string, string> = {
          phone_number: phoneNumber // Always include phone_number for AI agent
        };
        
        // Add additional dynamic variables if lead data exists
        if (customData.leads && customData.leads[index]) {
          const lead = customData.leads[index];
          
          if (lead.name) dynamicVariables.name = lead.name;
          if (lead.email) dynamicVariables.email = lead.email;  
          if (lead.purpose) dynamicVariables.purpose = lead.purpose;
          if (lead.id) dynamicVariables.lead_id = lead.id; // Add lead ID for user identification
        }
        
        // Always set conversation_initiation_client_data with at least phone_number
        recipient.conversation_initiation_client_data = {
          dynamic_variables: dynamicVariables,
          campaign_id: customData.campaignId, // Add campaign ID for tracking
          user_id: customData.leads?.[index]?.id // Add user_id for agent context
        };
        
        return recipient;
      });

      requestBody = {
        call_name: customData.campaignName || 'Batch Campaign',
        agent_id: this.agentId,
        agent_phone_number_id: customData.agentPhoneNumberId || process.env.ELEVENLABS_PHONE_NUMBER_ID,
        scheduled_time_unix: customData.scheduledTime || Math.floor(Date.now() / 1000), // Now or scheduled time
        recipients: recipients
      };

      const response = await axios.post(
        `${this.baseUrl}/convai/batch-calling/submit`,
        requestBody,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        batchId: response.data.batch_id || response.data.id
      };
    } catch (error) {
      const axiosError = error as AxiosError;  
      return {
        success: false,
        error: (axiosError.response?.data as any)?.detail || axiosError.message || 'Unknown error'
      };
    }
  }

  /**
   * Get batch calling status
   */
  async getBatchStatus(batchId: string): Promise<{ success: boolean; status?: any; error?: string }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/batch-calling/${batchId}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return {
        success: true,
        status: response.data
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error getting batch status:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: (axiosError.response?.data as any)?.detail || axiosError.message || 'Unknown error'
      };
    }
  }

  /**
   * Cancel a batch calling campaign
   */
  async cancelBatch(batchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.post(
        `${this.baseUrl}/convai/batch-calling/${batchId}/cancel`,
        {},
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error canceling batch:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: (axiosError.response?.data as any)?.detail || axiosError.message || 'Unknown error'
      };
    }
  }


  /**
   * Get all conversations for the agent
   * https://elevenlabs.io/docs/api-reference/conversations/list
   */
  async getAllConversations(
    pageSize: number = 50,
    cursor?: string,
    options?: {
      callStartAfter?: number; // Unix timestamp
      callStartBefore?: number; // Unix timestamp
      callSuccessful?: boolean;
      userId?: string;
    }
  ): Promise<{ 
    success: boolean; 
    conversations?: any[]; 
    nextCursor?: string;
    hasMore?: boolean;
    error?: string;
  }> {
    try {
      const params: any = {
        page_size: Math.min(pageSize, 100), // Max 100 per API docs
        agent_id: this.agentId // Filter by configured agent
      };

      // Add optional parameters
      if (cursor) params.cursor = cursor;
      if (options?.callStartAfter) params.call_start_after_unix = options.callStartAfter;
      if (options?.callStartBefore) params.call_start_before_unix = options.callStartBefore;
      if (options?.callSuccessful !== undefined) params.call_successful = options.callSuccessful;
      if (options?.userId) params.user_id = options.userId;

      const response = await axios.get(
        `${this.baseUrl}/convai/conversations`,
        {
          headers: {
            'xi-api-key': this.apiKey
          },
          params
        }
      );

      return {
        success: true,
        conversations: response.data.conversations || [],
        nextCursor: response.data.next_cursor,
        hasMore: response.data.has_more || false
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error getting conversations:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: (axiosError.response?.data as any)?.detail || axiosError.message || 'Unknown error'
      };
    }
  }

  /**
   * Backwards compatible method for simple conversation fetching
   * Wrapper around getAllConversations for existing code
   */
  async getConversationsSimple(limit: number = 50): Promise<{ success: boolean; conversations?: any[]; error?: string }> {
    const result = await this.getAllConversations(limit);
    return {
      success: result.success,
      conversations: result.conversations,
      error: result.error
    };
  }

  /**
   * Get detailed conversation info with transcript
   * Enhanced version of existing getConversationStatus method
   */
  async getConversationDetails(conversationId: string): Promise<{ success: boolean; conversation?: any; error?: string }> {
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
        conversation: response.data
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error getting conversation details:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: (axiosError.response?.data as any)?.detail || axiosError.message || 'Unknown error'
      };
    }
  }

  /**
   * Get conversation audio from ElevenLabs
   * https://elevenlabs.io/docs/api-reference/conversations/get-audio
   */
  async getConversationAudio(conversationId: string): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    try {
      console.log('Fetching audio for conversation:', conversationId);
      const response = await axios.get(
        `${this.baseUrl}/convai/conversations/${conversationId}/audio`,
        {
          headers: {
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer' // Get audio as binary data
        }
      );
      
      console.log('Audio response status:', response.status);
      console.log('Audio response headers:', response.headers);
      console.log('Audio response data type:', typeof response.data);
      console.log('Audio response data length:', response.data.byteLength);
      
      // Convert binary audio data to base64 data URL
      const audioBuffer = Buffer.from(response.data);
      const audioBase64 = audioBuffer.toString('base64');
      const mimeType = response.headers['content-type'] || 'audio/mpeg';
      const audioUrl = `data:${mimeType};base64,${audioBase64}`;
      
      console.log('Generated audio URL length:', audioUrl.length);
      console.log('Generated audio URL start:', audioUrl.substring(0, 100));
      
      return {
        success: true,
        audioUrl
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error getting conversation audio:', axiosError.response?.data || axiosError.message);
      console.error('Error status:', axiosError.response?.status);
      return {
        success: false,
        error: (axiosError.response?.data as any)?.detail || axiosError.message || 'Unknown error'
      };
    }
  }
}