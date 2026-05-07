export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
}

export interface Chat {
  _id?: string;
  userId: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}