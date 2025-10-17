# **App Name**: VoiceVision Pilot

## Core Features:

- Voice Recording: Capture user's voice input through the browser's MediaRecorder API.
- STT Submission: Send the recorded audio to a Speech-to-Text service at `http://127.0.0.1:8081/stt`.
- Command Processing: Process voice commands with basic if/else logic to trigger actions. This includes the 'help' command tool, providing guidance to the user about which prompts it recognizes.
- TTS Output: Convert text responses into spoken audio using a Text-to-Speech service at `http://127.0.0.1:8081/tts`.
- Command Log: Display a log of user commands and the system's responses for a clear interaction history.
- Status Updates: Provide real-time status updates (e.g., 'Recording...', 'Recognizing...') to inform the user of the app's current state.
- Example Commands: Show a list of example commands to guide the user on available functionalities.

## Style Guidelines:

- Primary color: Soft blue (#64B5F6) to evoke calmness and focus.
- Background color: Light gray (#F0F4F7) to minimize distractions.
- Accent color: Warm orange (#FFB74D) to highlight interactive elements.
- Body and headline font: 'PT Sans', a humanist sans-serif.
- Use clear, simple icons to represent commands and actions, with high contrast for better visibility.
- Large, easily tappable/clickable buttons for primary actions like the voice recording button.
- Subtle animations and transitions to provide feedback on actions without being distracting.