import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { HumanMessage } from '@langchain/core/messages';

@Injectable()
export class SocketService {
  private readonly connectedClients: Map<string, Socket> = new Map();

  handleConnection(socket: Socket): void {
    const clientId = socket.id;
    this.connectedClients.set(clientId, socket);

    socket.on('disconnect', () => {
      this.connectedClients.delete(clientId);
    });
  }

  async handleGenerateTest(client: Socket, payload: any) {
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-1.0-pro',
      temperature: 0.7,
      topK: 50,
      topP: 1,
      safetySettings,
    });

    const parts = [
      {
        text: "Your task is to generate unit test for the provided code to test it for reliability, scalability and potential bugs to look out for. Output only the code nothing else also don't add the name of language on the top:",
      },
      {
        text: `fileName: ${payload.fileName}\ninput: ${payload.input}`,
      },
    ];

    const responses = [];

    const res = await model.stream([
      new HumanMessage({
        content: parts.map((val) => {
          return {
            type: 'text',
            text: val.text,
          };
        }),
      }),
    ]);

    for await (const chunks of res) {
      responses.push(chunks.content.toString());
    }

    client.emit(
      'generate-test',
      this.removeSpecificBackticks(responses.join('')),
    );
  }

  async handleFindBugsAndFix(client: Socket, payload: any) {
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const model = new ChatGoogleGenerativeAI({
      modelName: 'tunedModels/ai-test-generator-2--qjvykv8ejs6g',
      temperature: 0.7,
      topK: 50,
      topP: 1,
      safetySettings,
    });

    const parts = [
      {
        text: "Your task is to find potential bugs and fix them for the provided code. Output only the code nothing else also don't add the name of language on the top:",
      },
      {
        text: `fileName: ${payload.fileName}\ninput: ${payload.input}`,
      },
    ];

    const responses = [];

    const res = await model.stream([
      new HumanMessage({
        content: parts.map((val) => {
          return {
            type: 'text',
            text: val.text,
          };
        }),
      }),
    ]);

    for await (const chunks of res) {
      responses.push(chunks.content.toString());
    }

    client.emit(
      'find-bugs-and-fix',
      this.removeSpecificBackticks(responses.join('')),
    );
  }

  removeSpecificBackticks(input: string): string {
    // Check if the string starts and ends with a backtick
    if (input.startsWith('```') && input.endsWith('```')) {
      // Remove the first three backticks, if present
      const startRemovals = 3;
      for (let i = 0; i < startRemovals && input.indexOf('`') !== -1; i++) {
        input = input.replace('`', '');
      }

      // Remove the last three backticks, if present
      const endRemovals = 3;
      for (let i = 0; i < endRemovals && input.lastIndexOf('`') !== -1; i++) {
        const lastIndex = input.lastIndexOf('`');
        input = input.substring(0, lastIndex) + input.substring(lastIndex + 1);
      }
    }

    return input;
  }
}
