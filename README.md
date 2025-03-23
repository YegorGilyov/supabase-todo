# Supabase Todo App

A simple todo application built with React, TypeScript, and Supabase, featuring authentication and real-time updates.

## Features

- User authentication (sign up, sign in, sign out)
- Create, read, update, and delete todos
- Real-time updates
- Responsive design
- TypeScript support
- CSS Modules for styling
- React Router for navigation

## Project Structure

```
src/
├── components/     # React components
├── services/      # Service layer for data operations
├── hooks/         # Custom React hooks
├── pages/         # Page components
├── styles/        # CSS Modules
├── types/         # TypeScript types
└── lib/           # Utility functions and configurations
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account and project

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd supabase-todo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Architecture

- **Service Layer**: All data operations are encapsulated in service classes
- **Custom Hooks**: React hooks that use the service layer for data operations
- **Components**: Presentational components that use custom hooks
- **CSS Modules**: Scoped CSS for each component
- **TypeScript**: Type safety throughout the application
- **Real-time Updates**: Supabase real-time subscriptions for live updates

## License

MIT
