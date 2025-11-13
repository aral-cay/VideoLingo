# Italian Video Practice — Control

A web application for practicing Italian through video content with integrated quizzes. This is the CONTROL version with telemetry tracking.

## Features

- **Home Page**: Browse a grid of Italian video tiles with thumbnails, titles, durations, and "Watch" buttons
- **Video Player**: Watch videos with HTML5 video controls, captions toggle, and quiz integration
- **Quiz System**: Multiple-choice questions with per-question timing, scoring, and completion tracking
- **Telemetry**: Comprehensive event tracking logged to both console and localStorage
- **Accessibility**: Full keyboard navigation, ARIA labels, focus management, and responsive design

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

## Project Structure

```
src/
├── main.tsx              # Application entry point
├── App.tsx               # Router configuration
├── types.ts              # TypeScript type definitions
├── styles.css            # Global styles
├── data/
│   └── videos.json       # Sample video and quiz data
├── pages/
│   ├── Home.tsx          # Home page with video grid
│   └── Player.tsx        # Video player page
├── components/
│   ├── VideoTile.tsx     # Individual video tile component
│   ├── QuizModal.tsx     # Quiz modal component
│   └── TelemetryViewer.tsx # Dev-only telemetry inspector
├── hooks/
│   ├── useTelemetry.ts   # Telemetry tracking hook
│   └── useStopwatch.ts   # Stopwatch utility hook
└── utils/
    └── time.ts           # Time formatting utilities
```

## Telemetry

### Where to Find Telemetry

**In Browser DevTools:**

1. **Console**: All telemetry events are logged to the console with the format:
   ```
   [Telemetry:home] eventName { payload }
   [Telemetry:player] eventName { payload }
   ```

2. **localStorage**: Telemetry data is stored in localStorage under keys:
   - `telemetry:home` - Home page events
   - `telemetry:player` - Player page events
   - `visit_times` - Array of visit timestamps
   - `lastVisitedAt` - Last visit timestamp
   - `video_state:{videoId}` - Per-video state (completion, position, captions)
   - `quiz_results:{videoId}` - Quiz completion results

**To inspect in DevTools:**
1. Open DevTools (F12)
2. Go to Application/Storage tab → Local Storage
3. Look for keys starting with `telemetry:`

### TelemetryViewer Component

In development mode, a "📊 Telemetry" button appears in the bottom-left corner. Click it to:
- View all telemetry data in a formatted JSON view
- Download telemetry data as JSON
- Clear all telemetry data
- Refresh the view

### Tracked Events

#### Home Page (`telemetry:home`)
- `page_start` - Page load timestamp
- `page_end` - Page unload timestamp
- `time_on_page` - Total time spent on page
- `visit_times` - Array of visit timestamps
- `time_between_visits` - Time elapsed since last visit
- `time_to_click_watch` - Time from page load to first "Watch" button click

#### Player Page (`telemetry:player`)
- `page_start` - Page load timestamp
- `page_end` - Page unload timestamp
- `time_on_page` - Total time spent on page
- `time_to_click_start_quiz` - Time from player mount to quiz start click
- `video_pause` - Video paused (with currentTime)
- `video_resume` - Video resumed (with currentTime)
- `video_completion_percent` - Video completion percentage (tracked at 10% intervals and on unmount/end)
- `popup_show` - Quiz modal opened
- `popup_hide` - Quiz modal hidden
- `popup_quiz_start` - Quiz started
- `question_response_time` - Time taken to answer each question
- `question_correct` - Correct answer selected
- `question_incorrect` - Incorrect answer selected
- `questions_answered` - Running count of answered questions
- `popup_quiz_completion` - Quiz completed (with score data)
- `score_accuracy` - Final quiz accuracy score
- `time_to_quiz_completion` - Total time from quiz start to completion
- `captions_on` - Captions enabled
- `captions_off` - Captions disabled
- `time_to_click_return_home` - Time from quiz completion to "Return Home" click

## Modifying Data

### Changing Video List

Edit `src/data/videos.json` to add, remove, or modify videos. Each video object should have:

```json
{
  "id": "unique-id",
  "title": "Video Title",
  "description": "Video description",
  "duration": 180,
  "thumbnail": "https://image-url.com/image.jpg",
  "src": "https://video-url.com/video.mp4",
  "captions": [
    { "lang": "it", "url": null }
  ],
  "quiz": {
    "instructions": "Quiz instructions text",
    "questions": [
      {
        "id": "q1",
        "prompt": "Question text?",
        "choices": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctIndex": 0
      }
    ],
    "passingScore": 2,
    "maxScoreBehavior": "basic"
  }
}
```

### Changing Quiz Questions

Modify the `quiz.questions` array in `src/data/videos.json`. Each question requires:
- `id`: Unique identifier
- `prompt`: Question text
- `choices`: Array of answer options
- `correctIndex`: Zero-based index of the correct answer

## Exporting Telemetry Logs

1. **Using TelemetryViewer** (Development mode):
   - Click the "📊 Telemetry" button
   - Click "Download JSON" to save all telemetry data

2. **Manual Export**:
   - Open DevTools → Application → Local Storage
   - Copy the values for `telemetry:home` and `telemetry:player`
   - Save as JSON files

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Development Notes

- The app uses React Router for navigation
- All telemetry is stored client-side in localStorage
- Video state (position, captions) persists across sessions
- Quiz results are saved per video
- The TelemetryViewer component only appears in development mode (`import.meta.env.DEV`)

## Accessibility

- Full keyboard navigation support (Tab, Enter, Space, Escape)
- ARIA labels on all interactive elements
- Focus traps in modal dialogs
- Screen reader friendly markup
- Sufficient color contrast ratios
- Responsive design for mobile and desktop

## Browser Support

- Modern browsers with ES2020 support
- HTML5 video support required
- localStorage support required for telemetry persistence


