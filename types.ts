export interface Prompt {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  tags: string[];
  likes: number;
  imageUrl?: string;
  isOfficial?: boolean;
}

export interface User {
  username: string;
  avatar: string;
  isAdmin: boolean;
}

export type ModalType = 'LOGIN' | 'EDIT' | null;

export interface EditModalProps {
  prompt: Prompt;
  onSave: (updatedPrompt: Prompt) => void;
  onClose: () => void;
}
