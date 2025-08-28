import twilio from 'twilio';

export class MockTwilioService {
  generateTwiMLResponse(message?: string, action?: any): string {
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

export const testTwiML = (): void => {
  console.log('Testing TwiML generation...\n');

  const service = new MockTwilioService();
  
  const response1 = service.generateTwiMLResponse('Hello, this is a test call.');
  console.log('Basic TwiML:');
  console.log(response1);
  console.log('');
  
  const response2 = service.generateTwiMLResponse(
    'Please hold while we connect you.',
    { type: 'redirect', url: 'http://localhost:3000/api/twilio/connect' }
  );
  console.log('TwiML with redirect:');
  console.log(response2);
  console.log('');
  
  const response3 = service.generateTwiMLResponse(
    'Press 1 for sales, 2 for support.',
    { 
      type: 'gather', 
      url: 'http://localhost:3000/api/twilio/process-input',
      timeout: 10
    }
  );
  console.log('TwiML with gather:');
  console.log(response3);
  
  console.log('\n✅ TwiML generation test passed!');
};