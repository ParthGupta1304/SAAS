-- Migration: Add is_read column to incidents table
-- Required for in-app notification bell mark-as-read functionality.
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "is_read" boolean DEFAULT false NOT NULL;
