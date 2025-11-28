
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
  rating?: number; // 1-5
  status?: 'approved' | 'pending' | 'rejected';
}

export interface User {
  username: string;
  avatar: string;
  isAdmin: boolean;
}

export type ModalType = 'LOGIN' | 'EDIT' | 'SUBMIT' | null;

export interface EditModalProps {
  prompt: Prompt;
  onSave: (updatedPrompt: Prompt) => void;
  onClose: () => void;
}
