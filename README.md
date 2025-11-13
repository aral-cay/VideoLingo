# VideoLingo

Contextual and Gamified Language Learning

A web application for learning languages through video content with integrated quizzes. Features a futuristic dark theme UI and YouTube-style video player interface.

## Features

- **Login System**: Secure authentication with user profiles (Aral, Kabir, Luca)
- **Home Page**: Browse a grid of video tiles with thumbnails, titles, and durations
- **Video Player**: YouTube-style player with embedded video playback
- **Quiz System**: Interactive quizzes accessible via sidebar popup
- **Protected Routes**: Authentication required to access video content
- **Modern UI**: Futuristic dark theme with gradient effects and glowing grid patterns

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

## Login Credentials

- **Username**: Aral | **Password**: Aral123
- **Username**: Kabir | **Password**: Kabir123
- **Username**: Luca | **Password**: Luca123

## Project Structure

```
src/
├── main.tsx              # Application entry point
├── App.tsx               # Router configuration
├── types.ts              # TypeScript type definitions
├── styles.css            # Global styles
├── data/
│   ├── videos.json       # Video and quiz data
│   └── users.ts          # User credentials
├── pages/
│   ├── Login.tsx         # Login page
│   ├── Home.tsx          # Home page with video grid
│   └── Player.tsx        # Video player page
├── components/
│   ├── VideoTile.tsx     # Individual video tile component
│   ├── QuizModal.tsx     # Quiz modal component
│   └── ProtectedRoute.tsx # Route protection component
├── contexts/
│   └── AuthContext.tsx   # Authentication context
└── hooks/
    └── useStopwatch.ts   # Stopwatch utility hook
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Technologies Used

- React
- Vite
- TypeScript
- React Router
- CSS3 (Gradients, Animations)

## Browser Support

- Modern browsers with ES2020 support
- HTML5 video support required
- localStorage support required for session persistence
