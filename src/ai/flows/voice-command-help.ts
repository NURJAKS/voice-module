'use server';

/**
 * @fileOverview This file defines the voice command help flow for the VoiceVision Pilot application.
 *
 * The flow allows users to say 'help' and receive a list of available commands.
 *
 * @file VoiceCommandHelp
 * Defines the VoiceCommandHelpInput, VoiceCommandHelpOutput types and the voiceCommandHelp flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceCommandHelpInputSchema = z.object({
  userInput: z
    .string()
    .describe('The user input string. This should always be "help".'),
});
export type VoiceCommandHelpInput = z.infer<typeof VoiceCommandHelpInputSchema>;

const VoiceCommandHelpOutputSchema = z.object({
  availableCommands: z
    .string()
    .describe('A list of available commands that the user can say.'),
});
export type VoiceCommandHelpOutput = z.infer<typeof VoiceCommandHelpOutputSchema>;

export async function voiceCommandHelp(input: VoiceCommandHelpInput): Promise<VoiceCommandHelpOutput> {
  return voiceCommandHelpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'voiceCommandHelpPrompt',
  input: {schema: VoiceCommandHelpInputSchema},
  output: {schema: VoiceCommandHelpOutputSchema},
  prompt: `You are a voice assistant. The user has asked for help.
  You should respond with a list of available commands that the user can say.

  The available commands are: "открыть игры", "пазлы", "расскажи сказку", "пауза", "продолжи", "помощь", "пока".
  Return the list of available commands in the availableCommands field.
  Example: Я понимаю: привет, сказка, игры, помощь, пока.
  `,
});

const voiceCommandHelpFlow = ai.defineFlow(
  {
    name: 'voiceCommandHelpFlow',
    inputSchema: VoiceCommandHelpInputSchema,
    outputSchema: VoiceCommandHelpOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
