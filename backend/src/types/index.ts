export interface TwilioCallRequest {
  From: string;
  To: string;
  CallSid: string;
  AccountSid?: string;
  ApiVersion?: string;
  Direction?: string;
  ForwardedFrom?: string;
  CallerName?: string;
}

export interface TwilioCallResponse {
  success: boolean;
  callSid?: string;
  status?: string;
  error?: string;
}

export interface TwilioCallStatus {
  success: boolean;
  status?: string;
  duration?: string;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export interface TwiMLAction {
  type: 'dial' | 'gather' | 'redirect';
  number?: string;
  url?: string;
  timeout?: number;
  prompt?: string;
}

export interface ElevenLabsOutboundRequest {
  phoneNumber: string;
  customParameters?: Record<string, any>;
}

export interface ElevenLabsCallResponse {
  success: boolean;
  conversationId?: string;
  status?: string;
  error?: string;
}

export interface ElevenLabsConversationStatus {
  success: boolean;
  status?: string;
  duration?: number;
  transcript?: string;
  error?: string;
}

export interface ElevenLabsWebSocketResponse {
  success: boolean;
  wsUrl?: string;
  token?: string;
  error?: string;
}

export interface ElevenLabsPhoneNumberRequest {
  phoneNumber: string;
  label: string;
}

export interface ElevenLabsPhoneNumberResponse {
  success: boolean;
  phoneNumberId?: string;
  status?: string;
  error?: string;
}

export interface ElevenLabsPhoneNumber {
  phone_number_id: string;
  phone_number: string;
  label: string;
  status: string;
  agent_id: string;
}

export interface ElevenLabsPersonalizationData {
  name?: string;
  account_type?: string;
  last_interaction?: string;
  preferences?: {
    communication_style?: string;
    language?: string;
  };
  [key: string]: any;
}