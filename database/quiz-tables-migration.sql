-- Quiz Tables Migration
-- Run this SQL in your Supabase SQL editor

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    note_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_count INTEGER NOT NULL DEFAULT 0,
    question_types TEXT[] NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('note', 'audio', 'mixed')),
    source_content TEXT,
    generation_options JSONB,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'fill_blank')),
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    options JSONB,
    order_index INTEGER NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_tags table (for many-to-many relationship)
CREATE TABLE IF NOT EXISTS quiz_tags (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(quiz_id, tag)
);

-- Create quiz_attempts table (to track user quiz attempts)
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    time_taken_seconds INTEGER,
    answers JSONB NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_note_id ON quizzes(note_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty ON quizzes(difficulty);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_type ON quiz_questions(question_type);

CREATE INDEX IF NOT EXISTS idx_quiz_tags_quiz_id ON quiz_tags(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_tags_tag ON quiz_tags(tag);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_at ON quiz_attempts(completed_at DESC);

-- Enable Row Level Security
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for quizzes
DROP POLICY IF EXISTS "Users can view their own quizzes" ON quizzes;
CREATE POLICY "Users can view their own quizzes" ON quizzes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quizzes" ON quizzes;
CREATE POLICY "Users can insert their own quizzes" ON quizzes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quizzes" ON quizzes;
CREATE POLICY "Users can update their own quizzes" ON quizzes
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quizzes" ON quizzes;
CREATE POLICY "Users can delete their own quizzes" ON quizzes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for quiz_questions
DROP POLICY IF EXISTS "Users can view questions for their quizzes" ON quiz_questions;
CREATE POLICY "Users can view questions for their quizzes" ON quiz_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_questions.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert questions for their quizzes" ON quiz_questions;
CREATE POLICY "Users can insert questions for their quizzes" ON quiz_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_questions.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update questions for their quizzes" ON quiz_questions;
CREATE POLICY "Users can update questions for their quizzes" ON quiz_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_questions.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete questions for their quizzes" ON quiz_questions;
CREATE POLICY "Users can delete questions for their quizzes" ON quiz_questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_questions.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );

-- RLS policies for quiz_tags
DROP POLICY IF EXISTS "Users can view tags for their quizzes" ON quiz_tags;
CREATE POLICY "Users can view tags for their quizzes" ON quiz_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_tags.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert tags for their quizzes" ON quiz_tags;
CREATE POLICY "Users can insert tags for their quizzes" ON quiz_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_tags.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete tags for their quizzes" ON quiz_tags;
CREATE POLICY "Users can delete tags for their quizzes" ON quiz_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_tags.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );

-- RLS policies for quiz_attempts
DROP POLICY IF EXISTS "Users can view their own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can view their own quiz attempts" ON quiz_attempts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can insert their own quiz attempts" ON quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Quiz owners can view attempts on their quizzes" ON quiz_attempts;
CREATE POLICY "Quiz owners can view attempts on their quizzes" ON quiz_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_attempts.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON quizzes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_attempts TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
CREATE TRIGGER update_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quiz_questions_updated_at ON quiz_questions;
CREATE TRIGGER update_quiz_questions_updated_at
    BEFORE UPDATE ON quiz_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

