export interface Video {
  id: string;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  src: string;
  captions: Array<{ lang: string; url: string | null }>;
  quiz: {
    instructions: string;
    questions: Array<{
      id: string;
      prompt: string;
      choices: string[];
      correctIndex: number;
    }>;
    passingScore: number;
    maxScoreBehavior: string;
  };
}


